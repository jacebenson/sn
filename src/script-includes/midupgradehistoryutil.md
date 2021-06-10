---
title: "MIDUpgradeHistoryUtil"
id: "midupgradehistoryutil"
---

API Name: global.MIDUpgradeHistoryUtil

```js
var MIDUpgradeHistoryUtil;
(function() { 
	MIDUpgradeHistoryUtil = {
		getSuccessfulUpgrades: getSuccessfulUpgrades,	// Returns the number of MID Servers that upgraded 															// successdully during an instance upgrade
		getPendingUpgrades: getPendingUpgrades,			// Returns the number of MID Server which are in
														// upgrading state or failed in upgrade
		midSupportsUpgradeStages: midSupportsUpgradeStages, // Returns true if MID Server has the code
															// for Upgrade stages
		
		getHistoryWithoutNotification: getHistoryWithoutNotification, // Return the most recent upgrade
																	// history without notification 												
		
		type: 'MIDUpgradeHistoryUtil'
	};
	
	
	function getSuccessfulUpgrades(historySysId) {
		var grSQ = new GlideAggregate('ecc_agent_upgrade_history_stage');
		grSQ.addQuery('upgrade_history', historySysId);
		grSQ.addQuery('stage', 'MidUpgraded');
		grSQ.addQuery('state', 'Completed');
		grSQ.groupBy('mid_server');
		grSQ.query();
		return grSQ.getRowCount();
	}
	
	function getPendingUpgrades(historySysId) {
		var agg = new GlideAggregate('ecc_agent_upgrade_history_stage');
		agg.addQuery('upgrade_history', historySysId);
		agg.groupBy('mid_server');
		agg.query();
		return (agg.getRowCount() - getSuccessfulUpgrades(historySysId));
	}
	
	function midSupportsUpgradeStages(midVersion) {
		
		// There is a record in the MID Server but the version is not set yet
		if (!midVersion)
			return false;

		var midReleaseName = midVersion.match(/^[a-zA-Z]/);

		// The mid version doesn't have release name it is on Master or before Geneva
		if (!midReleaseName)
			return false;

		// MID version is before New York  and it doesn't have the proper code
		if (midReleaseName[0].toLowerCase() < 'n')
			return false;

		return true;
	}
	
	function getHistoryWithoutNotification() {
		var newVersion = (gs.getProperty('mid.version'));
		var overrideVersion = gs.getProperty('mid.version.override');
		if (overrideVersion)
			newVersion = overrideVersion;
		
		var gr = new GlideRecord('ecc_agent_upgrade_history');
		gr.addQuery('new_version', newVersion);
		gr.orderByDesc('sys_created_on');
		gr.query();
		if (!gr.next())
			return null;
		
		var hSysId = gr.getUniqueValue();
		var stageGr = new GlideRecord('ecc_agent_upgrade_history_stage');
		stageGr.addQuery('upgrade_history', hSysId);
		stageGr.addQuery('stage', 'UpgradeNotification');
		stageGr.query();
		
		if (stageGr.hasNext())
			return null;
		return hSysId;
	}
})();
```