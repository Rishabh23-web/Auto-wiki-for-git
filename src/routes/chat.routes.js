import { Router } from "express";
import { searchChunk } from "../service/vectorStore.js";
import { generateWikiAnswer } from "../service/wikiGenerator.js";
import { parseRepo } from "../service/github.js";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const { repo, question } = req.body ?? {};
        if (typeof repo !== "string" || !repo.trim() || typeof question !== "string" || !question.trim())
            return res.status(400).json({ error: "Both repo and question are required." });

        const { owner, repo: repoName, repoKey } = parseRepo(repo);
        if (!owner || !repoName) return res.status(400).send({ error: "Owner or repo not found" });

        const chunks = await searchChunk(repoKey, question);

        if (chunks.length === 0) return res.status(404).send({ error: "No relevant information found" });

        const answer = await generateWikiAnswer(repoKey, question, chunks);
        const sources = [...new Set(chunks.map((c) => c.path).filter(Boolean))];

        res.status(200).json({ repo: repoKey, answer, sources });

    } catch (err) {
        return res.status(err?.status || 500).json({ error: err.message || "Failed to generate answer" })
    }

});

export default router;