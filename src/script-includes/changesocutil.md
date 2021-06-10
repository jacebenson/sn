---
title: "ChangeSoCUtil"
id: "changesocutil"
---

API Name: global.ChangeSoCUtil

```js
var ChangeSoCUtil = Class.create();
ChangeSoCUtil.prototype = {
	initialize: function() {
	},

	orderBy: {
		ASC: "^ORDERBY",
		DESC: "^ORDERBYDESC"
	},

	updateLegacyChangeScheduleModule: function (checkUpgrade) {
		if (checkUpgrade && GlidePluginManager.isZboot())
			return;
		var moduleGr = new GlideRecord("sys_app_module");
		if (!moduleGr.get("9c036e380a0a0b53761604a927664211"))
			return;
		if (moduleGr.getValue("title").indexOf("Legacy") !== -1)
			return;
		moduleGr.setValue("title", moduleGr.getValue("title") + " (Legacy)");
		moduleGr.update();
	},

	defineSpanColorStyleRule: function (socGrId, condition, socDefaultSpanColor) {
		var socStyleGr = new GlideRecord("chg_soc_definition_style_rule");
		socStyleGr.setValue("chg_soc_definition", socGrId);
		socStyleGr.setValue("condition", condition);
		socStyleGr.setValue("name", "CSS span color");
		socStyleGr.setValue("order", 1000000);
		socStyleGr.setValue("event_color", socDefaultSpanColor);
		socStyleGr.insert();
	},

	migrateStyleRule: function (timelineGrId, socGrId) {
		var timelineStyleGr = new GlideRecord("cmn_timeline_page_style");
		if (!timelineStyleGr.isValid()) {
			gs.log("cmn_timeline_page_style is not a valid table");
			return;
		}
		timelineStyleGr.addQuery("timeline_page", timelineGrId);
		timelineStyleGr.query();

		var socStyleGr = new GlideRecord("chg_soc_definition_style_rule");
		if (!socStyleGr.isValid()) {
			gs.log("chg_soc_definition_style_rule is not a valid table");
			return;
		}
		while (timelineStyleGr.next()) {
			socStyleGr.initialize();
			socStyleGr.setValue("chg_soc_definition", socGrId);
			socStyleGr.setValue("condition", timelineStyleGr.getValue("condition"));
			socStyleGr.setValue("name", "Migrated style rule");
			socStyleGr.setValue("order", timelineStyleGr.getValue("order"));
			socStyleGr.setValue("event_color", timelineStyleGr.span_color.color + "");
			socStyleGr.setValue("label_color", timelineStyleGr.label_color.color + "");
			socStyleGr.setValue("label_weight", timelineStyleGr.getValue("label_decoration"));
			socStyleGr.insert();
		}
	},

	getOwner: function (userId) {
		var gr = new GlideRecord("sys_user");
		gr.addActiveQuery();
		gr.addQuery("user_name", userId);
		gr.query();
		if (!gr.next())
			return "";
		return gr.getUniqueValue();
	},

	getRecordSummary: function (fields) {
		if (fields.length === 0)
			return;
		fields = fields.split(",");
		var middle = Math.round(fields.length / 2);
		return {
			left: fields.slice(0, middle).join(","),
			right: fields.slice(middle, fields.length).join(",")
		};
	},

	getCondition: function (condition, sortByOrder, sortBy) {
		return condition + this.orderBy[sortByOrder] + sortBy;
	},

	hasDynamicCondition: function (query) {
		var queryString = new GlideQueryString(query + "");
		queryString.deserialize();
		var terms = queryString.getTerms();
		for (var i = 0; i < terms.size(); i++) {
			var operator = terms.get(i).getOperator() + "";
			if (operator.indexOf("DYNAMIC") !== -1)
				return true;
		}
		return false;
	},

	migrateChangeSchedule: function (checkUpgrade) {
		if (checkUpgrade && GlidePluginManager.isZboot())
			return;

		var timelineGr = new GlideRecord("cmn_timeline_page");
		timelineGr.addQuery("table", "change_request");
		timelineGr.query();

		var socGr = new GlideRecord("chg_soc_definition");
		if (!socGr.isValid()) {
			gs.log("chg_soc_definition is not a valid table");
			return;
		}
		while (timelineGr.next()) {
			socGr.initialize();
			socGr.setValue("name", timelineGr.getValue("name"));
			socGr.setValue("start_date_field", timelineGr.getValue("start_date_field"));
			socGr.setValue("end_date_field", timelineGr.getValue("end_date_field"));

			var owner = this.getOwner(timelineGr.getValue("sys_updated_by"));
			if (owner)
				socGr.setValue("owner", owner);

			var condition = this.getCondition(timelineGr.getValue("condition"), timelineGr.getValue("sort_by_order"), timelineGr.getValue("sort_by"));
			if (condition)
				socGr.setValue("condition", condition);

			var summary = this.getRecordSummary(timelineGr.getValue("tooltip_label"));
			if (summary) {
				socGr.setValue("popover_left_col_fields", summary.left);
				socGr.setValue("popover_right_col_fields", summary.right);
			}

			var socGrId = socGr.insert();

			var cssSpanColor = timelineGr.getValue("css_span_color");
			if (cssSpanColor)
				this.defineSpanColorStyleRule(socGrId, timelineGr.getValue("condition"), cssSpanColor);

			if (socGrId)
				this.migrateStyleRule(timelineGr.getUniqueValue(), socGrId);
		}
	},

	getUserProfile: function(sysId) {
		var user = GlideUser.getUserByID(sysId);
 		if (!user.exists())
 			return {};

		var managerId = user.getManagerID();
		var managerName = "";
		if (managerId)
			managerName = GlideUser.getUserByID(user.getManagerID()).getFullName();

		return {
			"userID": sysId,
			"avatar": user.getAvatar() || "",
			"initials": user.getInitials() || "",
			"name": user.getFullName() || "",
			"title": user.getTitle() || "",
			"email": user.getEmail() || "",
			"contact_number": user.getMobileNumber() || user.getBusinessNumber() || "",
			"manager_name": managerName
		};
	},

	getUserAvatar: function(sysId) {
		return GlideUser.getUserByID(sysId).getAvatar();
	},

	getUserInitials: function(sysId) {
		return GlideUser.getUserByID(sysId).getInitials();
	},

	getUserFullName: function(sysId) {
		return GlideUser.getUserByID(sysId).getFullName();
	},

	getUserTitle: function(sysId) {
		return GlideUser.getUserByID(sysId).getTitle();
	},

	getUserEmail: function(sysId) {
		return GlideUser.getUserByID(sysId).getEmail();
	},

	getUserContactNumber: function(sysId) {
		return GlideUser.getUserByID(sysId).getMobileNumber() || GlideUser.getUserByID(sysId).getBusinessNumber();
	},

	getGroupMembers: function(sysId) {
		return GlideUserGroup.getMembers(sysId);
	},

	getRoles: function() {
		return GlideStringUtil.join(GlideSecurityManager.get().getRoles());
	},

	isConnectAvailable: function() {
		return GlideCollaborationCompatibility.isChatEnabled() && GlideCollaborationCompatibility.isFrameSetEnabled();
	},

	isAccessibilityEnabled: function() {
		return GlideAccessibility.isEnabled();
	},

	getProfiles: function(tableName, sysIds) {
		if (!tableName || !sysIds || !sysIds.length)
			return [];

		var validSysIds = sysIds.filter(function(sysId) {
			var re = /^[a-f0-9]{32}$/i;
			return re.test(sysId);
		});

		var profiles = [];
		if (tableName === "sys_user")
			validSysIds.forEach(function(sysId) {
				
				var profile = this.getUserProfile(sysId);
				profile.sys_id = sysId;
				profile.tableName = "sys_user";
				if (profile.sys_id)
					profiles.push(profile);
			}, this);
		else {
			var gr = new GlideRecord(tableName);
			gr.addQuery("sys_id", validSysIds);
			gr.query();
			while (gr.next()) {
				var profile = this.getProfile(gr);
				if (profile.sys_id)
					profiles.push(profile);
			}
		}
		return profiles;
	},

	getProfile: function(gr) {
		var profile = {};
		if (!gr)
			return profile;

		var tableName = gr.getTableName();
		var sysId = gr.sys_id + "";
		if (tableName === "sys_user")
			profile = this.getUserProfile(sysId);
		else {
			var name = gr.name.getDisplayValue();
			profile.initials = this._getInitials(name);
			profile.name = name;
		}
		profile.tableName = tableName;
		profile.sys_id = sysId;
		return profile;
	},

	_getInitials: function(name) {
		if (!name)
			return "";

		// (1) Remove everything wrapped in non-word characters like: David "Danger" Loo (NOW) -> David  Loo
		name = name.replace(/[^\w\s\.][\w\.\@]+[^\w\s\.]|[^\w\s\.]/gi, "");

		// (2) Remove multiple spaces: David  Loo -> David Loo
		name = name.replace(/\s+/gi, " ");

		// (3) Remove leading and trailing spaces
		name = name.trim();

		// (4) Remove leading period characters
		name = name.replace(/^\./gi, "");

		// (5) Remove leftover spaces
		name = name.trim();

		if (!name)
			return "";

		var firstInitial = "";
		var lastInitial = "";
		var nameParts = name.split(/[\s\.]/);

		// Check the first element of the array
		if (nameParts[0])
			firstInitial = nameParts[0][0].toUpperCase();

		// Check the last element of the array
		if ((nameParts.length > 1) && nameParts[nameParts.length - 1])
			lastInitial = nameParts[nameParts.length - 1][0].toUpperCase();

		return firstInitial + lastInitial;
	},

	canRead: function() {
		return GlideTableDescriptor.get("chg_soc_definition").canRead();
	},

	type: "ChangeSoCUtil"
};
```