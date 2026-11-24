import { createHash } from "node:crypto";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Pinecone } from "@pinecone-database/pinecone";

const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});


const UPSERT_BATCH_SIZE = 100;


function getIndex(namespace) {
    const indexName = process.env.PINECONE_INDEX || "git-wiki";

    return pinecone.index({ name: indexName }).namespace(namespace);
}

function normalizeDocuments(documents) {
    return documents
        .map((doc) => ({
            pageContent: typeof doc.pageContent === "string" ? doc.pageContent : "",
            metadata: doc.metadata ?? {},
        }))
        .filter((doc) => doc.pageContent.trim().length > 0);
}
/**
 * Assigns a deterministic SHA-256 record ID to each record from repo, metadata.path and chunk content
 * If this function breaks we won't get unique id to records and our database will crash
 */
function buildRecordId(repo, metadata, content) {
    return createHash("sha256")
        .update(`${repo}:${metadata.path ?? ""}:${content}`)
        .digest("hex");
}

/**
 * Normalizes document chunks, embeds them in batches of 100 via OpenAI, and upserts them into a repo-scoped Pinecone namespace.
 * Without batching inside this loop, large repos exceed OpenAI's per-request token limit and crash the background indexing job.
 *
 * @param {string} repo - Repository identifier in "owner/repo" format.
 * @param {Array<{pageContent: string, metadata?: Object}>} documents - Chunked documents produced by chunkFiles.
 * @returns {Promise<{saved: boolean, chunkCount: number}>}
 */

export async function saveChunk(repo, documents) {
    const chunks = normalizeDocuments(documents);

    if (!chunks.length) {
        return { saved: false, chunkCount: 0 };
    }

    const namespace = repo.replace("/", "-");

    const index = getIndex(namespace);
    for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
        const batch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
        const texts = batch.map((doc) => doc.pageContent);
        const vectors = await embeddings.embedDocuments(texts);
        const records = batch.map((doc, j) => ({
            id: buildRecordId(repo, doc.metadata, doc.pageContent),
            values: vectors[j],
            metadata: {
                text: doc.pageContent,
                path: doc.metadata.path,
                repo: doc.metadata.repo ?? repo,
            }
        }));

        await index.upsert({
            records
        })
    }

    return { saved: true, chunkCount: chunks.length };
}

export async function searchChunk(repo, query, topK = 6) {

    if (!repo?.trim() || !query?.trim()) return []
    const namespace = repo.replace("/", "-");

    const index = getIndex(namespace);

    const queryVector = await embeddings.embedQuery(query);
    const dbSearch = await index.query({ vector: queryVector, topK, includeMetadata: true })
    const responses = dbSearch.matches ?? [];
    return responses.map((response) =>
    ({
        path: response.metadata?.path,
        text: response.metadata?.text,
        score: response.score ?? 0
    }))


}

