
import fs from 'fs';
import { Table } from 'console-table-printer';


export class Logger {
    verbose = false;

    static out(out){
        console.log(`[-] ${out}`);
    }
    
    static info(info){
        console.log(`[+] ${info}`);
    }
    
    static err(err, msg){
        console.log(`[x] ${err}`);
        if (msg && msg.length > 0) { console.log(`[x] ERROR: ${msg}`); }
    }
    
    static json(json){
        console.log(JSON.stringify(json, null, 4));
    }

    static printTableFromJson(data){
        const p = new Table({
            columns: [
                {name: 'Repository', alignment: 'left'}
            ],
        });

        for (let repo in data) {
            let obj = Object.assign({'Repository': repo}, data[repo]);
            const anyTrue = Object.values(obj).some(value => value === true);
            if (anyTrue) { p.addRow(obj, { color: 'green' }); }
            else { p.addRow(obj, { color: 'red' }); }
        }

        p.printTable();
    }

    static writeJsonToFile(filename, json) {
        fs.writeFileSync(filename, JSON.stringify(json));
    }
}

