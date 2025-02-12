import fs from 'fs';
import { SIEM } from './siem.js';

export class Utils extends SIEM {
    static readRepoFileToList(repoFile) {
        const repos = [];
        const content = fs.readFileSync(repoFile, 'utf-8');
        content.split(/\r?\n/).forEach(line => {
            if (line.trim().length > 0) { repos.push(line.trim()); }
        });
        return repos;
    }
}
