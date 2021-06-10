---
title: "MIDServerSystemCommandUtil"
id: "midserversystemcommandutil"
---

API Name: global.MIDServerSystemCommandUtil

```js
var MIDServerSystemCommandUtil = Class.create();

MIDServerSystemCommandUtil.prototype = {

    initialize: function() {
    },
	/***********************************************************************************************************/
	issueSystemCommandToSpecificMID: function(system_command_name, mid_name) {

		if (JSUtil.nil(system_command_name)) {
			gs.warn('MIDServerSystemCommandUtil.issueSystemCommandToSpecificMID() found nil system_command_name');
			return;
		}

		if (JSUtil.nil(mid_name)) {
			gs.warn('MIDServerSystemCommandUtil.issueSystemCommandToSpecificMID() found nil mid_name');
			return;
		}
		var probeFields = {};
		probeFields.agent = mid_name;
		probeFields.topic = "SystemCommand";
		probeFields.source = system_command_name;
		probeFields.priority = "0";
		probeFields.queue = "output";
		probeFields.state = "ready";
		
		var probe = new SncProbe();
		probe.topic = "SystemCommand";
		probe.source = system_command_name;
		probe.setEccPriority("0");
		probe.addParameter("skip_sensor", "true");

		if (!SNC.ECCQueueUtil.hasDuplicateOutputRecords(probeFields))
			probe.create("mid.server." + mid_name);
	},
	/***********************************************************************************************************/
	issueSystemCommandToAllMIDs: function(system_command_name) {

		if (JSUtil.nil(system_command_name)) {
			gs.warn('MIDServerSystemCommandUtil.issueSystemCommandToAllMIDs() found nil system_command_name');
			return;
		}

		var gr = new GlideRecord("ecc_agent");
		gr.query();
		while (gr.next())
			this.issueSystemCommandToSpecificMID(system_command_name, gr.name);
	},
	/***********************************************************************************************************/
    type: 'MIDServerSystemCommandUtil'
};
```