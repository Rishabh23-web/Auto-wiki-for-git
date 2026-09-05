import { OpenAIEmbeddings } from "@langchain/openai";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";

const embeddings = new OpenAIEmbeddings({ module: "text-embedding-3-small" });
const pinecone = new Pinecone();

function getIndex() {
    return pinecone.Index(process.env.PINECONE_INDEX || "repo-chat");
}