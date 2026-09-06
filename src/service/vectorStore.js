import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

const embeddings = new OpenAIEmbeddings({ module: "text-embedding-3-small" });
const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY
});

function getIndex() {
    return pinecone.Index(process.env.PINECONE_INDEX || "git-wiki");
}

export async function saveChunk(repo, documents) {
    const namespace = repo.replace("/", "-");

    const index = getIndex();

    index.upsert({
        records: documents
    });

    return { saved: true, chunkCount: documents.length }
}