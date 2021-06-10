---
title: "APMTableFieldsScopeFix"
id: "apmtablefieldsscopefix"
---

API Name: global.APMTableFieldsScopeFix

```js
var APMTableFieldsScopeFix = Class.create();
APMTableFieldsScopeFix.prototype = {
    initialize: function() {
    },
	fixAPMBusinessApplicationScope: function() {
    var wf = gs.getSession().getWorkflow();
    gs.getSession().setWorkflow(true);
    GlideFixStuff.fixAPMBusinessApplicationScope();
    gs.getSession().setWorkflow(wf);
    },
	fixAPMBusinessApplicationCustomFieldsScope: function() {
    var wf = gs.getSession().getWorkflow();
    gs.getSession().setWorkflow(true);
		GlideFixStuff.fixAPMBusinessApplicationCustomFieldsScope();
    gs.getSession().setWorkflow(wf);
    },
	fixAPMBusinessCapabilityScope: function() {
    var wf = gs.getSession().getWorkflow();
    gs.getSession().setWorkflow(true);
		GlideFixStuff.fixAPMBusinessCapabilityScope();
    gs.getSession().setWorkflow(wf);
    },
	fixAPMBusinessCapabilityCustomFieldsScope: function() {
    var wf = gs.getSession().getWorkflow();
    gs.getSession().setWorkflow(true);
		GlideFixStuff.fixAPMBusinessCapabilityCustomFieldsScope();
    gs.getSession().setWorkflow(wf);
    },
    fixAPMIdeaScope: function() {
    var wf = gs.getSession().getWorkflow();
    gs.getSession().setWorkflow(true);
		GlideFixStuff.fixAPMIdeaScope();
    gs.getSession().setWorkflow(wf);
    },
    type: 'APMTableFieldsScopeFix'
};
```