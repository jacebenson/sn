---
title: "OCRotaMember"
id: "ocrotamember"
---

API Name: global.OCRotaMember

```js
var OCRotaMember = Class.create();
OCRotaMember.prototype = {
    initialize: function() {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
    },

	deactivateUser: function(userId, deactivateDate) {
		if (JSUtil.nil(deactivateDate))
			deactivateDate = new GlideDateTime();

		var gr = new GlideRecord('cmn_rota_member');
		gr.addActiveQuery();
		gr.addQuery('member', userId);
		gr.addNullQuery('to');
		gr.query();
		while (gr.next()) {
			gr.setValue('to', deactivateDate);
			gr.update();
		}
	},

	hasOrderChanged: function(current, previous) {
		var highestOrder = current.order > previous.order ? current.order : previous.order;
		var lowestOrder = current.order < previous.order ? current.order : previous.order;

		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[hasOrderChanged] highestOrder: " + highestOrder + " lowestOrder: " + lowestOrder);
			this.log.debug("[hasOrderChanged] previous: " + previous.getUniqueValue());
			this.log.debug("[hasOrderChanged] current: " + current.getUniqueValue());
		}

		// check if jumping members
		var membersGr = new GlideRecord("cmn_rota_member");
		membersGr.addQuery("sys_id", "!=", previous.getUniqueValue());
		membersGr.addQuery("roster", current.roster + "");
		membersGr.addQuery("order", ">=", lowestOrder);
		membersGr.addQuery("order", "<=", highestOrder);
		membersGr.query();
		var rows = membersGr.getRowCount();
		var changed = rows != 0;

		if (this.log.atLevel(GSLog.DEBUG)) {
			this.log.debug("[hasOrderChanged] changed: " + changed);
			while (membersGr.next())
				this.log.debug("[hasOrderChanged] membersGr.sys_id: " + membersGr.getUniqueValue() + " order: " + membersGr.order);
		}

		return changed;
	},

	validateDates: function(from, to) {
		// ensure from date is before the to date
		if (JSUtil.nil(from) && JSUtil.nil(to))
			return true;

		var fromGd = new GlideDate();
		fromGd.setValue(from);
		var toGd = new GlideDate();
		toGd.setValue(to);
		return fromGd.compareTo(toGd) <= 0;
	},

	hasChanged: function(current, previous) {
		var changed = current.member.changes() || current.to.changes() || current.from.changes() || this.hasOrderChanged(current, previous);

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[hasChanged] changed: " + changed);

		return changed;
	},

	recalculate: function(current) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[recalculate] roster: " + current.roster);

		OnCallRotationRecalc.updateSchedules(current.roster.getRefRecord());
	},
	
	rotaRepeatLimitExceeded: function(gr) {
		if (!gr)
			return false;

		var rosterGR;
		var tableName = gr.getRecordClassName();
		if ("cmn_rota_roster" === tableName)
			rosterGR = gr;
		else if ("cmn_rota_member" === tableName) {
			rosterGR = new GlideRecord("cmn_rota_roster");
			if (!rosterGR.get(gr.getValue("roster")))
				return false;
		} else
			return false;
		
		var rotationInterval = parseInt(rosterGR.getValue("rotation_interval_count"), 10);
		var weeklyInterval = "weekly" === rosterGR.getValue("rotation_interval_type");
		if (weeklyInterval)
			rotationInterval *= 7;

		var memberCount = 0;
		var ga = new GlideAggregate("cmn_rota_member");
		ga.addQuery("roster", rosterGR.getUniqueValue());
		ga.addAggregate("COUNT");
		ga.query();
		if (ga.next())
			memberCount = parseInt(ga.getAggregate("COUNT"), 10);
		
		// Add 1 to member Count as we are factoring the insert of a new cmn_rota_member record
		if ("cmn_rota_member" === tableName)
			memberCount++;
		if (memberCount > 0)
			rotationInterval *= memberCount;

		var maxRepeatCount = parseInt(gs.getProperty("com.snc.on_call_rotation.max_rotation_repeat_count", 182000), 10);

		if (rotationInterval <= maxRepeatCount)
			return false;

		var dailyIntervalCount = Math.floor(maxRepeatCount / memberCount);
		
		if ("cmn_rota_roster" === tableName)
			if (weeklyInterval)
				gs.addErrorMessage(gs.getMessage("The repeat count for each member has exceeded the limit of {0} years ({1} weeks/{2} days). For {3} members, the value of 'Rotate every' for the roster should be set to {4} weeks to be within the limit.", [Math.floor(maxRepeatCount / 364) + "", Math.floor(maxRepeatCount / 7) + "", maxRepeatCount + "", memberCount + "", Math.floor(dailyIntervalCount / 7) + ""]));
			else
				gs.addErrorMessage(gs.getMessage("The repeat count for each member has exceeded the limit of {0} years ({1} days/{2} weeks). For {3} members, the value of 'Rotate every' for the roster should be set to {4} days to be within the limit.", [Math.floor(maxRepeatCount / 364) + "", Math.floor(maxRepeatCount / 7) + "", maxRepeatCount + "", memberCount + "", dailyIntervalCount + ""]));
		else
			if (weeklyInterval)
				gs.addErrorMessage(gs.getMessage("The repeat count for each member has exceeded the limit of {0} years ({1} weeks/{2} days). To add another member, the value of 'Rotate every' for the roster should be set to {3} weeks, for a total of {4} members to be within the limit.", [Math.floor(maxRepeatCount / 364) + "", Math.floor(maxRepeatCount / 7) + "", maxRepeatCount + "", Math.floor(dailyIntervalCount / 7) + "", memberCount + ""]));
			else
				gs.addErrorMessage(gs.getMessage("The repeat count for each member has exceeded the limit of {0} years ({1} weeks/{2} days). To add another member, the value of 'Rotate every' for the roster should be set to {3} days, for a total of {4} members to be within the limit.", [Math.floor(maxRepeatCount / 364) + "", Math.floor(maxRepeatCount / 7) + "", maxRepeatCount + "", dailyIntervalCount + "", memberCount + ""]));
		
		return true;
	},

    type: 'OCRotaMember'
};
```