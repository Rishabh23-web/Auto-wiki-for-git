import "dotenv/config";
import { generateWikiAnswer } from "../src/service/wikiGenerator.js";

export default class wikiGeneratorProvider {
    id() {
        return "auto-wiki-generator";
    }

    async callApi(prompt, context) {
        try {
            const { repo, chunks } = context.vars;
            const output = await generateWikiAnswer(repo, prompt, chunks);
            return { output };
        } catch (err) {
            return { error: err.message };
        }
    }
}