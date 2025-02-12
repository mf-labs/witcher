import { GitHub } from './github.js';
import { Utils } from '../utils/utils.js';

export class GHAS extends GitHub {
    constructor() {
        super();
        this.name = 'GHAS';
        this.getRepoUrl = 'GET /repos/{owner}/{repo}';
        this.updateGhasUrl = 'PATCH /repos/{owner}/{repo}';
    }

    async getAllReposWhereGHASIsDisabled(){
        let repos = await super.getRepos();
        let name = this.name;
        // Only return the repo names where ghas is not enabled:
        let reposName = repos.filter(function(i){
            return i.private && 
            !i.archived && 
            i.security_and_analysis.advanced_security.status !== 'enabled' && 
            !GitHub.checkForModuleExclusion(i.name, name) ;
        })
        .map(function(i){
            const name = i.name;
            return name;
        });
        return reposName;
    }

    async enable(repo){
        try{
            let response = await this.octokit.request(this.updateGhasUrl, {
                owner: this.org,
                repo: repo,
                security_and_analysis: {"advanced_security": { "status": "enabled" }},
                headers: this.headers
              });
            return response;
        }
        catch(err){ return err; }
    }

    async disable(repo){
        try {
            let response = await this.octokit.request(this.updateGhasUrl, {
                owner: this.org,
                repo: repo,
                security_and_analysis: {"advanced_security": { "status": "disabled" }},
                headers: this.headers
              });
            return response;
        }
        catch (err) { return err; }
    }

    async massAction(action, repos){
        Utils.out(`Mass ${action} GHAS on ${repos.length} repositories`);
        for(let i=0; i < repos.length; i++){
            await this.action(action, repos[i]);
        }
    }

    async action(action, repo){
        if(await this.validateRepo(repo)){ return; }
        
        if (action === 'status' && repo.toLowerCase() === 'all') {
            Utils.out('List repositories where GHAS is disabled');
            let reposName = await this.getAllReposWhereGHASIsDisabled();

            Utils.info(`Total: ${reposName.length}`);
            Utils.json(reposName);
            return reposName;
        }
        else if (action === 'status') {
            Utils.out(`Checking GHAS status for '${repo}' repository`);
            let res = await this.getRepo(repo);
            
            if (res.status === 200 || res.status === 201) {
                Utils.info(`GHAS ${res.data.security_and_analysis.advanced_security.status} for ${repo}`);
                return res.data.security_and_analysis.advanced_security.status;
            }
            else {
                Utils.err(`Couldn't get GHAS status for ${repo}`,`${res.response.data.message}`); 
                return false;
            }
            
        }
        else if (action === 'enable') {
            Utils.out(`Enabling GHAS for '${repo}' repository`);
            let res = await this.enable(repo);
            
            if (res.status === 200 || res.status === 201) { 
                Utils.info(`GHAS is enabled for '${repo}'`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true; 
            }
            else { 
                Utils.err(`Couldn't enable GHAS ${repo}`,`${res.response.data.message}`); 
                return false;
            }
        }
        else if (action === 'disable') {
            Utils.out(`Disabling GHAS for '${repo}' repository`);
            let res = await this.disable(repo);
            
            if (res.status === 200 || res.status === 201){ 
                Utils.info(`GHAS is disabled for '${repo}'`); 
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true; 
            } 
            else { 
                Utils.err(`Couldn't disable GHAS ${repo}`, `${res.response.data.message}`); 
                return false;
            }
        }
    }
}
