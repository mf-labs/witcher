import { GitHub } from './github.js';
import { Utils } from '../utils/utils.js';
import { GHAS } from './ghas.js';


export class SecretScanning extends GitHub {
    constructor() {
        super();
        this.name = 'SecretScanning';
        this.updateSecretScanningUrl = 'PATCH /repos/{owner}/{repo}';
    }

    // Get names of all repos where secret scanning is disabled
    async getAllReposWithSecretScanningDisabled() {
        let repos = await this.getRepos() // Get all repos
        let name = this.name;
        // Only return the repo names where secret scanning is not enabled:
        let reposName = repos.filter(function (i) {
            return i.private && 
            !i.archived && 
            i.security_and_analysis.secret_scanning.status !== 'enabled' && 
            !GitHub.checkForModuleExclusion(i.name, name);
        })
        .map(function (i) {
            const name = i.name;
            return name;
        });
        return reposName;
    }

    // Enable secret scanning on a repo:
    async enable(repo) {
        try {
            // first enable GHAS if not already
            const ghas = new GHAS();
            await ghas.action('enable', repo);

            let response = await this.octokit.request(this.updateSecretScanningUrl, {
                owner: this.org,
                repo: repo,
                security_and_analysis: { "secret_scanning": { "status": "enabled" }, "secret_scanning_push_protection": { "status": "enabled" } },
                headers: this.headers
            });
            return response;
        }
        catch (err) { return err; }
    }


    // Disable secret scanning on a repo:
    async disable(repo) {
        try {
            let response = await this.octokit.request(this.updateSecretScanningUrl, {
                owner: this.org,
                repo: repo,
                security_and_analysis: { "secret_scanning": { "status": "disabled" }, "secret_scanning_push_protection": { "status": "disabled" } },
                headers: this.headers
            });
            return response;
        }
        catch (err) { return err; }
    }


    async massAction(action, repos) {
        Utils.out(`Mass ${action} secret protection on ${repos.length} repositories`);
        for (let i = 0; i < repos.length; i++) {
            await this.action(action, repos[i]);
        }
    }


    async action(action, repo) {

        if(await this.validateRepo(repo)){ return; }

        if (action === 'status' && repo.toLowerCase() === 'all') {
            Utils.out('List repositories where Secret Scanning is disabled');
            let reposName = await this.getAllReposWithSecretScanningDisabled();
            Utils.out(`Total: ${reposName.length}`);
            Utils.json(reposName);
            return reposName;
        }
        else if (action === 'status' && repo) {
            Utils.out(`Checking Secret Scanning status for '${repo}' repository`);
            let res = await this.getRepo(repo);
            if (res.status == 200 || res.status == 201) {
                Utils.info(`Secret Scanning is ${res.data.security_and_analysis.secret_scanning.status} for '${repo}'`);
                return true;
            }
            else {
                Utils.err(`Couldn't get Secret Scanning status for ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
        else if (action === 'enable' && repo) {
            Utils.out(`Enabling Secret Scanning for '${repo}' repository`);
            let res = await this.enable(repo);
            if (res.status === 200 || res.status === 201) {
                Utils.info(`Secret Scanning is enabled for '${repo}'`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true;
            }
            else {
                Utils.err(`Couldn't enable Secret Scanning for ${repo}`, `${res.response.data.message}`);
                return false;
            }

        }
        else if (action === 'disable' && repo) {
            Utils.out(`Disabling Secret Scanning for '${repo}' repository`);
            let res = await this.disable(repo);
            if (res.status === 200 || res.status === 201) {
                Utils.info(`Secret Scanning is disable for '${repo}'`);
                Utils.logUpdateInSIEM(this.name, action, repo, 'success');
                return true;
            }
            else {
                Utils.err(`Couldn't disable Secret Scanning for ${repo}`, `${res.response.data.message}`);
                return false;
            }
        }
    }
}