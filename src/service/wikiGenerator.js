import { ChatOpenAI } from "@langchain/openai"

const openai = new ChatOpenAI({ model: "gpt-4o-mini", temperature: 0 })
export function buildContext(chunks, maxChars = 24000) {
    let prompt = "";
    for (let i = 0; i < chunks.length; i++) {
        let chunk = chunks[i];
        const block = `### File: ${chunk.path}\n\`\`\`\n${chunk.text}\n\`\`\`\n\n`;
        if (prompt.length + block.length > maxChars) break;
        prompt += block;
    }
    return prompt;
}

export async function withRetry(fn, maxRetries = 3) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            const status = err?.status ?? err?.response?.status;
            if ((status == 429 || status == 503) && attempt < maxRetries - 1) {
                await new Promise((res) => setTimeout(res, 1000 * 2 ** attempt));
            }
            else {
                throw err;
            }
        }
    }
}

function toText(content) {
    if (typeof content === "string") return content;
    if (Array.isArray(content)) {
        return content
            .map((part) => (typeof part === "string" ? part : part.text ?? ""))
            .join("");
    }
    return String(content ?? "")
}

/**
 * generateWikiAnswer function converts our project into a full fledge chatting RAG enabled chatting agent used for gaining knowledge about our github repo
 * @param {string} repo - Repository identifier in "owner/repo" format.
 * @param {string} question - Question that is asked by user to know about thier repo
 * @param {Array<Object>} chunks - Retirved information from vector db related to asked question.
 * @returns {Promise<string>}
 */


export async function generateWikiAnswer(repo, question, chunks) {
    if (!chunks || chunks.length === 0)
        return "No indexed code chunks found for this repository. Please index the repository first."
    const context = buildContext(chunks);
    const SystemPrompt = `
    Role :  Act as a strict code reviewer 
    Goal :
    Review the provided repository code ${repo}, answer the questions asked by user,
    answer the user's question strictly using the provided repository code snippets i.e ${context}. Cite exact file paths for e.g., [src/service/github.js] for every claim.
    If there is not enough information about the asked question explicitly reply "The indexed repository files do not contain enough information to answer this." this is to prevent hallucinations.
    `

    const res = await withRetry(() => openai.invoke([{
        role: "system",
        content: SystemPrompt
    },
    {
        role: "user",
        content: question,
    },
    ]));
    return toText(res.content);
}