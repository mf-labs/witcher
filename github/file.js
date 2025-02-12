import { GitHub } from './github.js';

export class File extends GitHub {
    constructor(){
        super();
        this.createFileUrl = 'PUT /repos/{owner}/{repo}/contents/{path}';
        this.deleteFileUrl = 'DELETE /repos/{owner}/{repo}/contents/{path}';
        this.getFileUrl = 'GET /repos/{owner}/{repo}/contents/{path}';
    }

    async replaceFile(repo, branch, fileContent, uploadPath, commitMessage){
        const fileSHA = await this.getFileSHA(repo, uploadPath);
        try {
            const res = await this.octokit.request(this.createFileUrl, {
                owner: this.org,
                repo: repo,
                path: uploadPath,
                branch: branch,
                message: commitMessage,
                content: fileContent,
                sha: fileSHA,
                headers: this.headers
            });
            return res;
        } 
        catch (err) { return err; }
    }

    async createFile(repo, branch, fileContent, uploadPath, commitMessage){
        try {
            const res = await this.octokit.request(this.createFileUrl, {
                owner: this.org,
                repo: repo,
                path: uploadPath,
                branch: branch,
                message: commitMessage,
                content: fileContent,
                headers: this.headers
            });
            return res;
        } 
        catch (err) { return err; }
    }

    async getFileSHA(repo, filePath){
        try {
            const res = await this.octokit.request(this.getFileUrl, {
                owner: this.org,
                repo: repo,
                path: filePath,
                headers: this.headers
            });
            return res.data.sha;
        } 
        catch (err) { return err; }
    }

    async deleteFile(repo, branch, filePath, commitMessage){
        const fileSHA = await this.getFileSHA(repo, filePath);
        try {
            const res = await this.octokit.request(this.deleteFileUrl, {
                owner: this.org,
                repo: repo,
                branch: branch,
                path: filePath,
                sha: fileSHA,
                message: commitMessage,
                headers: this.headers
            
            });
            return res;
        } 
        catch (err) { return err; }
    }

    async checkIfFileExists(repo, filePath){
        try {
            const res = await this.octokit.request(this.getFileUrl, {
                owner: this.org,
                repo: repo,
                path: filePath,
                headers: this.headers,
            });
            return res;
        } 
        catch (err) { return err; }
    }
}