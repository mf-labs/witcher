import { GitHub } from './github.js';

export class Branch extends GitHub {
    constructor() {
        super();

        this.listBranchesUrl = 'GET /repos/{owner}/{repo}/branches';
        this.getBranchUrl = 'GET /repos/{owner}/{repo}/branches/{branch}';
        this.createRefUrl = 'POST /repos/{owner}/{repo}/git/refs';
    }


    // Get names of all branches of specified repo
    async getNamesOfBranches(repo){
        // Only return the branch names where ghas is not enabled:
        try {
            let branches = await this.octokit.request(this.listBranchesUrl, {
                owner: this.org,
                repo: repo,
                headers: this.headers
            });
            return branches.data.map(function(i){
                return i.name;
            });
        } 
        catch (err) { return err;}
    }

    // Get details of specfied branch of specified repo
    async getDetailsOfBranch(repo, branch){
        try {
            let res = await this.octokit.request(this.getBranchUrl, {
                owner: this.org,
                repo: repo,
                branch: branch,
                headers: this.headers
            });
            return res.data;
        } 
        catch (err) { return err; }
    }

    // Get name of default branch of a repo
    async getDefaultBranch(repo){
        try {
            let res = await this.getRepo(repo);
            return res.data.default_branch;
        } 
        catch (err) { return err; }
    }

    // get sha value of default branch --> required to create new branch from the default branch
    async getSHAOfDefaultBranch(repo, defaultDranch){
        let branchData = await this.getDetailsOfBranch(repo, defaultDranch);
        return branchData.commit.sha;
    }


    // create a new branch on a specified repo:
    async createBranch(repo, branchName, SHA){
        try {
            let res = await this.octokit.request(this.createRefUrl, {
                owner: this.org,
                repo: repo,
                ref: 'refs/heads/' + branchName, // the name of our new branch
                sha: SHA, // sha1 value of the branch from which our new branch will be created (main/master in most cases).
                headers: this.headers
              });
            return res;
        } 
        catch (err) { return err; }
    }
}
