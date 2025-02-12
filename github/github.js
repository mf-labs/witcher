import { Octokit } from 'octokit';
import fs from 'fs';

import { Utils } from '../utils/utils.js';

export class GitHub {
    static exclusion = JSON.parse(fs.readFileSync('./github/data/exclusion.json'));

    constructor() {
        this.token = process.env.GITHUB_TOKEN;
        this.org = process.env.ORG;
        this.type = 'all';
        this.pageToBrowse = 10;
        this.perPage = 100;
        this.headers = {
            'X-GitHub-Api-Version': '2022-11-28',
            'Accept': 'application/vnd.github+json',
        };

        this.repos = null;
        this.octokit = null;
        this.auth();

        this.getReposUrl = 'GET /orgs/{org}/repos';
        this.getRepoUrl = 'GET /repos/{owner}/{repo}';
        // this.get_repo_language_url = 'GET /repos/{owner}/{repo}/languages'; {{ Delete Me }}
        // this.get_repo_teams_url = 'GET /repos/{owner}/{repo}/teams'; {{ Delete Me }}
    }

    auth() {
        this.octokit = new Octokit({
            auth: this.token,
            userAgent: 'secrets v1.2.3, witcher v2',
        });
    }

    // loadExclusion(){
    //     this.exclusion = JSON.parse(fs.readFileSync('./github/data/exclusion.json'));
    // }

    async validateRepo(repo){
        if (repo.length === 0){
            Utils.err('Blank repository name. Skipping the action!');
            return true;
        } else if (repo.toLowerCase() != "all") {
            if (this.name === 'IaC' && GitHub.checkForModuleExclusion(repo, this.name) === true) {
                return false;
            }
            else if (this.name === 'IaC' && GitHub.checkForModuleExclusion(repo, this.name) === false) {
                Utils.out(`${repo} matches exclusion criteria. Skipping the action!`); 
                return true;
            }

            if (GitHub.checkForModuleExclusion(repo, this.name)) { 
                Utils.out(`${repo} matches exclusion criteria. Skipping the action!`); 
                return true; 
            }
            
            if (! await this.checkIfRepoExists(repo)) { 
                Utils.err(`The provided repository "${repo}" does not exist. Please check repo name.`); 
                return true; 
            }
            return false;
        }
        return false;
    }

    async checkIfRepoExists(repoName){
        const repoExistStatus = await this.getRepo(repoName);
        if (repoExistStatus.status == 200) { return true; }
        return false;
    }

    async requestGitHub(repo, url){
        try {
            const res = await this.octokit.request(url, {
                owner: this.org,
                repo: repo,
                headers: this.headers
            });
            return res;
        } catch (err) { return err; }
    }

    async getRepo(repo) {
        let res = await this.requestGitHub(repo, this.getRepoUrl);
        return res;
    }
    
    async getRepos() {
        try{
            this.repo = [];
            for (let i = 1; i < this.pageToBrowse; ++i) {
                const repos = await this.octokit.request(this.getReposUrl, {
                    org: this.org,
                    per_page: this.perPage,
                    page: i,
                    type: this.type,
                });
                this.repo = this.repo.concat(repos.data);
                if (Object.keys(repos.data).length === 0) { return this.repo; }
            }
            return this.repo;
        }
        catch(err){ return []; }
    }

    async getAllReposNames(module) {
        const repos = await this.getRepos();
        let reposName = repos.filter(function (i) {
            return i.private && !i.archived && !GitHub.checkForModuleExclusion(i.name, module);
        })
        .map(function (i) {
            const name = i.name;
            return name;
        });

        return reposName;
    }

    static checkForModuleExclusion(reposName, module) {
        if (GitHub.exclusion[module].includes(reposName)) { return true; }
        return false;
    }
}
