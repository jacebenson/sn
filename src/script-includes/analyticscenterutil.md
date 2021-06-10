---
title: "AnalyticsCenterUtil"
id: "analyticscenterutil"
---

API Name: sn_pa_center.AnalyticsCenterUtil

```js
var AnalyticsCenterUtil = Class.create();
AnalyticsCenterUtil.prototype = {
    initialize: function() {},

    //Create Analytics Center module for each workspace that doesn't have it.
    createAnalyticsCenterModule: function() {
        gs.info('Create Analytics Center Modules for existing workspaces - Start.');
        var wSList = this._getWorkspaceListThatDoesNotHaveAnalyticsCenter();

        if (wSList == null || wSList.length === 0) {
            gs.info('All existing workspaces have currently Analytics Center Module. No new module will be created.');
            return;
        }

        var desc = 'Following Analytics Center Modules were created:';
        for (var i = 0; i < wSList.length; i++) {
            var moduleId = this.createACModule(wSList[i]);
            desc += '\nWorkspace:' + wSList[i] + ' Analytics Center:' + moduleId;
        }
        gs.info(desc);
        gs.info('Create Analytics Center Modules for existing workspaces - End');
    },

    //Get list of all workspaces without Analytics center module
    _getWorkspaceListThatDoesNotHaveAnalyticsCenter: function() {
        var wSList = [];
        var hasACList = this._getWorkspaceListThatHasAnalyticsCenter();
        //Those WSs already have Analytics center module defined as part of the "if" folder
        var potentialWorkspacesToSkip = this._getWorkspacesToSkip();
        
        var skippedWSs = [];
        for (var i=0; i < potentialWorkspacesToSkip.length; i++) {
            if (hasACList.indexOf(potentialWorkspacesToSkip[i]) === -1) {
                hasACList.push(potentialWorkspacesToSkip[i]);
                skippedWSs.push(potentialWorkspacesToSkip[i]);
            }
        }
        gs.info('Following workspaces been skipped since they will have their Analytics Center module installed through the "IF" folder:' + skippedWSs);

        var gr = new GlideRecord('sys_aw_master_config');
        gr.query();
        while (gr.next()) {
            if (hasACList.indexOf(gr.getUniqueValue()) === -1)
                wSList.push(gr.getUniqueValue());

        }
        gs.info('Following workspaces does not have Analytics Center module:' + wSList);
        return wSList;
    },

    //Get list of all workspaces that have Analytics center module
    _getWorkspaceListThatHasAnalyticsCenter: function() {
        var list = [];
        var gr = new GlideRecord('sys_aw_module');
        gr.addEncodedQuery('id=analytics_center');
        gr.query();
        while (gr.next())
            list.push(gr.getValue('workspace_config'));

        gs.info('Following workspaces has already Analytics Center module:' + list);
        return list;
    },

    // Creates a new Analytics Center module for workspace with "workspaceSysId".
    // Returns the sys_id of the new created Module.
    createACModule: function(workspaceSysId) {
        var gr = new GlideRecord('sys_aw_module');
        if (!gr.get('18ffa6d63be23300b733ac20e2efc44e')) { //This is Analytics Center Module that is shipped with Analytics Center plugin
            gs.error('Analytics Center Module with SysId: 18ffa6d63be23300b733ac20e2efc44e could not be found!');
            return;
        }
        gr.setValue('active', true); //in case the module was set to inactive for any reason for workspace agent, we will set it active for this workspace
        gr.setValue('order', '1000'); //To display Analytics Center icon last in workspace
        gr.setValue('workspace_config', workspaceSysId);
        return gr.insert();
    },

    //Returns list of all installed WSs that has pre-defined AC moudle shipped under if folder
    //We need to skip creating AC module for those WSs to avoid 2 Analytics Center modules for same WS
    _getWorkspacesToSkip: function() {
        var list = [];
        var gr = new GlideRecord('sys_aw_master_config');
        gr.addEncodedQuery('sys_idINfe3241b0736323007419c907fbf6a76f,bb551be5875133003058d1a936cb0b8f,6c8d4c7f5364330094fbddeeff7b125f,44406e7773003300844489b954f6a797,b47dea70b3210010ed7fc9c316a8dcf7,ff23c7f5b30323002a0862ac16a8dcc9,32107294533133004a77ddeeff7b1250');
        gr.query();
        while (gr.next())
            list.push(gr.getUniqueValue());

        return list;
    },

    type: 'AnalyticsCenterUtil'
};
```