import { GitHub } from "./github.js";

export class PullRequest extends GitHub {
    constructor(token, org) {
        super(token, org);
        this.openPullRequestUrl = 'POST /repos/{owner}/{repo}/pulls';
        this.createIssueCommentUrl = 'POST /repos/{owner}/{repo}/issues/{issue_number}/comments';
        this.createReviewCommentUrl = 'POST /repos/{owner}/{repo}/pulls/{pull_number}/comments';
        this.getPullRequestInfoUrl = 'GET /repos/{owner}/{repo}/pulls/{pull_number}';
        this.approve_pr_url = 'POST /repos/{owner}/{repo}/pulls/{pull_number}/reviews';
    }

    async reviewCommentOnPR(repo, pullNumber, body, commitId, path){
        try{
            let res = await this.octokit.request(this.createReviewCommentUrl, {
                owner: this.org,
                repo: repo,
                pull_number: pullNumber,
                body: body,
                commit_id: commitId,
                path: path,
                start_line: 1,
                start_side: 'RIGHT',
                line: 2,
                side: 'RIGHT',
                header: this.headers
            });
            return res;
        }
        catch(err) { return err; }
    }

    async issueCommentOnPR(repo, issueNumber, body){
        try{
            let res = await this.octokit.request(this.createIssueCommentUrl, {
                owner: this.org,
                repo: repo,
                issue_number: issueNumber,
                body: body,
                header: this.headers
            });
            return res;
        }
        catch(err) { return err; }
    }

    async openPullRequest(repo, branch, base, title, commitMessage){

        try {
            const res = await this.octokit.request(this.openPullRequestUrl, {
                owner: this.org,
                repo: repo,
                title: title,
                body: commitMessage,
                head: branch,
                base: base,
                headers: this.headers
            });
            return res;    
        } 
        catch (err) { return err; }
        
    }

    async getPullRequestInfo(repo, pullNumber){
        try {
            const res = await this.octokit.request(this.getPullRequestInfoUrl, {
                owner: this.org,
                repo: repo,
                pull_number: pullNumber,
                headers: this.headers,
            });
            return res;
        }
        catch (err) { return err; }
    }

    async approve_pr_test(_repo, _pull_number, _commit_id) {
        try {
            const _res = await this.octokit.request(this.approve_pr_url, {
                owner: this.org,
                repo: _repo,
                pull_number: _pull_number,
                commit_id: _commit_id,
                body: 'This is witcher, approving PR for testing purpose only !!!',
                event: 'APPROVE',
                comments: [],
                headers: this.headers,
            });
            return _res;
        }
        catch (error) {
            return error;
        }
    }
}
