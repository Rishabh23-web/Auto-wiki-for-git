import { Router } from "express";
import { inngest } from "../inngest/index.js";
import { parseRepo } from "../service/github.js";


const router = Router();

router.post("/", async (req, res) => {

    try {
        const { repo: repoInput, githubToken: bodyToken } = req.body ?? {};
        if (typeof repoInput !== "string" || !repoInput.trim()) {
            return res.status(400).json({ error: "repo is required." });
        }
        const githubToken = req.body.githubToken || process.env.GITHUB_TOKEN;
        const { owner, repo, repoKey } = parseRepo(req.body.repo);
        if (!owner || !repo) {
            return res.status(400).json({ error: "Invalid repository format. Use owner/repo or a GitHub URL." });
        }

        await inngest.send({
            name: "repo/index.requested",
            data: { githubToken, owner, repo, repoKey }
        });
        return res.status(202).json({ message: "Repo indexing started", repo: repoKey });
    }
    catch (err) {
        return res.status(err?.status || 500).json({ error: err.message || "Failed to queue indexing" });
    }


});


export default router;