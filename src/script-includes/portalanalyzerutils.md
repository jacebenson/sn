---
title: "PortalAnalyzerUtils"
id: "portalanalyzerutils"
---

API Name: global.PortalAnalyzerUtils

```js
var PortalAnalyzerUtils = Class.create();
PortalAnalyzerUtils.prototype = {
    initialize: function() {},
    // Get unique active user count by page
    getUserCountByPage: function(pageId) {

        var activePortalUserCount = 0;

        // Last 90 days user has accessed SP at least once
        try {
            var gr = new GlideAggregate('sys_user');
            gr.addAggregate('COUNT');
            var cond = gr.addJoinQuery('sp_log', 'sys_id', 'user');
            cond.addCondition('sys_created_on', '>=', 'javascript:gs.beginningOfLast90Days()');
            cond.addCondition('type', 'Page View');
            cond.addCondition('page', pageId);
            cond.addCondition('portal', '!=', 'NULL');
            gr.setWorkflow(false);
            gr.query();

            if (gr.next())
                activePortalUserCount = gr.getAggregate('COUNT');

        } catch (err) {
            activePortalUserCount = -1;
        }

        return activePortalUserCount;
    },

    // Get page count
    getPageViewCount: function(pageId) {

        var count = 0;

        try {
            var grLog = new GlideAggregate('sp_log');
            grLog.addAggregate('COUNT');
            grLog.addQuery('page', pageId);
            grLog.addQuery('sys_created_on', '>=', 'javascript:gs.beginningOfLast90Days()');
            grLog.addQuery('type', 'Page View');
            grLog.addQuery('portal', '!=', 'NULL');
            grLog.setWorkflow(false);
            grLog.query();

            if (grLog.next())
                count = grLog.getAggregate('COUNT');

        } catch (err) {
            count = -1;
        }

        return count;
    },
    type: 'PortalAnalyzerUtils'
};
```