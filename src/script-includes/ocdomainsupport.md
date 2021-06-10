---
title: "OCDomainSupport"
id: "ocdomainsupport"
---

API Name: global.OCDomainSupport

```js
var OCDomainSupport = Class.create();

OCDomainSupport.prototype = {

	CMN_ROTA: "cmn_rota",
	CMN_ROTA_MEMBER: "cmn_rota_member",
	CMN_ROTA_ROSTER: "cmn_rota_roster",
	PLUGIN_ID: "com.snc.on_call_rotation",
	ROSTER: "roster",
	ROSTER_SCHEDULE_SPAN: "roster_schedule_span",
	ROTA: "rota",
	ROTA_LEVEL: "com.snc.on_call_rotation.log.level",
	SCHEDULE: "schedule",
	UPDATE_MEMBER: "update.domain_cmn_rota_member",
	UPDATE_ROSTER: "update.domain_cmn_rota_roster",
	UPDATE_ROSTER_SCHEDULE_SPAN: "update.domain_roster_schedule_span",

	initialize: function() {
		this.domainStructureUtil = new ScheduleDomainStructureUtil(this.ROTA_LEVEL);
		this.log = new GSLog(this.ROTA_LEVEL, this.type);
	},

	fixDomainSupport: function() {
		// Update cmn_rota_member table to use domain_master
		var memberResult = this.domainStructureUtil.makeDomainMasterCompliant(this.CMN_ROTA_MEMBER, this.CMN_ROTA_ROSTER, this.ROSTER, this.PLUGIN_ID, this.UPDATE_MEMBER);

		// Only add domain_master attribute to cmn_rota_roster if cmn_rota_member was successful.
		if (memberResult.domain_master)
			this.domainStructureUtil.makeDomainMasterCompliant(this.CMN_ROTA_ROSTER, this.CMN_ROTA, this.ROTA, this.PLUGIN_ID, this.UPDATE_ROSTER);

		// Update roster_schedule_span table to use domain_master
		this.domainStructureUtil.makeDomainMasterCompliant(this.ROSTER_SCHEDULE_SPAN, this.CMN_SCHEDULE, this.SCHEDULE, this.PLUGIN_ID, this.UPDATE_ROSTER_SCHEDULE_SPAN);
	},

	type: "OCDomainSupport"
};
```