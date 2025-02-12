import axios from 'axios';
import { Logger } from './logger.js';

export class SIEM extends Logger {
    logOnSIEM = false;
    SERVERLESS_APP_URL = process.env.SERVERLESS_APP_URL;
    GITHUB_USER = process.env.GITHUB_USER;

    static convertArrayToTableObject(obj, str, data){
        obj.forEach(repo => {
            if (repo in data) {
                data[repo][str] = false;
            }
            else {
                data[repo] = {
                    'Repository': repo,
                    'Secret Scanning': true,
                    'GHAS': true,
                    'Dependabot' : true,
                    'Code Scanning': true,
                    'IaC Scanning': true,
                    'Paused Dependabot': true
                };
                data[repo][str] = false;
            }
        });
        return data;
    }

    static covertObjToArrayListOfObj(obj){
        const list = [];
        for (var repo in obj) {
            list.push(obj[repo]);
        }
        return list;
    }



    static async logDailySummary(ghas, secret, dependabot, isPaused, codeScanning, iacScanning){
        if (!this.logOnSIEM) { return; }
        try {
            let data = {};
            data = this.convertArrayToTableObject(ghas, "GHAS", data);
            data = this.convertArrayToTableObject(secret, "Secret Scanning", data);
            data = this.convertArrayToTableObject(dependabot, "Dependabot", data);
            data = this.convertArrayToTableObject(codeScanning, "Code Scanning", data);
            data = this.convertArrayToTableObject(iacScanning, "IaC Scanning", data);
            data = this.convertArrayToTableObject(isPaused, "Paused Dependabot", data);
            // data = this.convert_dict_to_table_object(_branch_protection, data);

            data = this.covertObjToArrayListOfObj(data);

            data = {
                "type" : "daily_summary",
                "data": {data}
            };

            let res = await axios.post(this.SERVERLESS_APP_URL, data);
            if(res.status === 202){ super.out(`Daily Summary have been logged !!!!`); }
            else { super.err(`ERROR: Daily summary logged :: ${res.status}`); }
        }
        catch (err){ super.err(`ERROR: ${err}\n`); }
    }

    static async logPRInSIEM(module, action, repo, pr, status){
        if (!this.logOnSIEM) { return; }
        try {
            let data = {
                "type": "pr_tracking",
                "data" : { 
                    "reponame": repo, 
                    "action": action, 
                    "module": module, 
                    "status": status, 
                    "username": this.GITHUB_USER, 
                    "pr": pr,
                }
            };

            let res = await axios.post(this.SERVERLESS_APP_URL, data);
            if(res.status == 202){ super.out(`${module} - ${action} PR have been logged against ${repo}`); }
        }
        catch(err){ super.err(`ERROR: LogPR ${err}\n`); }
    }


    static async logUpdateInSIEM(module, action, repo, status){
        if (!this.logOnSIEM) { return; }
        try{
            let data = {
                "type":"logs",
                "data":{ 
                    "reponame": repo, 
                    "action": action, 
                    "module": module, 
                    "status": status, 
                    "username": this.GITHUB_USER, 
                    // "timestamp": new Date() 
                }
            };

            let res = await axios.post(this.SERVERLESS_APP_URL, data);
            if(res.status == 202){ super.out(`${module} - ${action} activity have been logged against ${repo}`); }
        }
        catch(err){ super.err(`ERROR: Log Update ${err}\n`); }
    }
}