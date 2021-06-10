---
title: "WorkspaceAdminHelper"
id: "workspaceadminhelper"
---

API Name: global.WorkspaceAdminHelper

```js
var WorkspaceAdminHelper = Class.create();
WorkspaceAdminHelper.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    getWorkspaceUrl: function() {
        var id = this.getParameter('sysparm_workspace_id');

        if (!id)
            return;

        return this.generateFullUrl(id);
    },
    getWorkspaceAclId: function() {
        var id = this.getParameter('sysparm_workspace_id');

        if (!id)
            return;

        return this.generateAclId(id);
    },
    generatePrefix: function(scopeName) {
        var relativeUrl = 'workspace';

        if (!scopeName)
            return;

        var parts = scopeName.split('_');

        if (parts[0] == 'x' && parts.length < 3)
            return;

        var vendorCode = parts[0] == 'x' ? parts[1] : 'now';
        vendorCode = ['sn', 'snc'].indexOf(vendorCode) > -1  ? 'now' : vendorCode;

        var vendorSitePrefix = 'now' == vendorCode ? 'now' : 'x' + '/' + vendorCode;

        var sep = relativeUrl.startsWith('/') ? '' : '/';

        return vendorSitePrefix + sep + relativeUrl;
    },
    generateFullUrl: function(workspaceId) {
        var appId;
        var urlSuffix;

        var workspaceGR = new GlideRecord('sys_aw_master_config');

        if (workspaceGR.get(workspaceId)) {
            appId = workspaceGR.getValue('sys_scope');
            urlSuffix = workspaceGR.getValue('workspace_url');
        } else {
            return;
        }

        if (!appId || !urlSuffix)
            return;

        var appGR = workspaceGR.sys_scope.getRefRecord();

        if (!appGR || !appGR.isValidRecord())
            return;

        var urlPrefix = this.generatePrefix(appGR.getValue('scope'));

        if (!urlPrefix || !urlSuffix)
            return;

        return ['', urlPrefix, urlSuffix].join('/');
    },
    generateAclId: function(workspaceId) {
        var workspaceUrl = this.generateFullUrl(workspaceId);
        var aclName = workspaceUrl.replace(/\//g, '.').substring(1);
        var aclId;

        var aclGR = new GlideRecord('sys_security_acl');
        aclGR.addQuery('name', aclName);
        aclGR.setLimit(1);
        aclGR.query();

        if (aclGR.next()) {
            aclId = aclGR.getUniqueValue();
        }

        return aclId;
    }
});
```