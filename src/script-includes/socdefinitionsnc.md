---
title: "SoCDefinitionSNC"
id: "socdefinitionsnc"
---

API Name: sn_chg_soc.SoCDefinitionSNC

```js
var SoCDefinitionSNC = Class.create();
SoCDefinitionSNC.prototype = Object.extendsObject(SoC, {

	initialize: function(_gr, _gs) {
		SoC.prototype.initialize.call(this, _gr, _gs);
		this._socUtil = new global.ChangeSoCUtil();
	},

	addInvitees: function(recipients, inviteMessage, sendEmail) {
		var updateSysId = this._updatePermission(recipients);
		if (sendEmail)
			this.sendEmail(inviteMessage, recipients);

		var result = {
			chg_soc_definition: this._gr.getUniqueValue(),
			recipients: recipients,
			updated: false
		};
		if (updateSysId)
			result.updated = true;
		return result;
	},

	canDelete: function() {
		return this.canWrite();
	},

	canRead: function() {
		var currentUser = this._gs.getUser();
		return this.canWrite() || this.isSharedWith(currentUser);
	},

	canWrite: function() {
		return this._gr.isNewRecord() || this.isOwner(this._gs.getUser());
	},

	// If the given user is the owner
	isOwner: function(user) {
		if (!(this._gr && this._gr.isValidRecord()))
			return false;

		// Are they the owner?
		if (this._gr.owner + "" === user.getID() + "")
			return true;

		//Are they in the owning group
		if (user.isMemberOf(this._gr.group_owner + ""))
			return true;

		return false;
	},

	_isSharedWithUsers: function(user) {
		if (!this._gr.share_users.nil()) {
			var users = this._gr.share_users.split(",");
			for (var ui = 0; ui < users.length; ui++)
				if (user.getID() + "" === users[ui])
					return true;
		}
	},

	_isSharedWithGroups: function(user) {
		if (!this._gr.share_groups.nil()) {
			var groups = this._gr.share_groups.split(",");
			for (var gi = 0; gi < groups.length; gi++)
				if (user.isMemberOf(groups[gi]))
					return true;
		}
	},

	_isSharedWithRoles: function(user) {
		if (!this._gr.share_roles.nil() && user.hasRole(this._gr.getDisplayValue("share_roles")))
				return true;
		return false;
	},

	// If the definition is shared with the given user
	isSharedWith: function(user) {
		if (!(this._gr && this._gr.isValidRecord()))
			return false;

		// NOT shared
		if (this._gr.share_with.nil())
			return false;

		// Shared with Everyone
		if (this._gr.share_with + "" === "1")
			return true;

		// Shared with Users, Groups, Roles
		if (this._gr.share_with + "" === "2")
			if (this._isSharedWithUsers(user) || this._isSharedWithGroups(user) || this._isSharedWithRoles(user))
				return true;
		return false;
	},

	_sort: function(field, reverse, primer) {
		var key = primer ? function(x) { return primer(x[field]); } : function(x) { return x[field]; };
		reverse = !reverse ? 1 : -1;
		return function(a, b) {
			a = key(a);
			b = key(b);
			return reverse * ((a > b) - (b > a));
		};
	},

	getSuggestions: function(query) {
		if (!query)
			return [];

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[getSuggestions] query: " + query);

		var limit = parseInt(this._gs.getProperty(SoC.PROP_SUGGESTION_LIMIT, SoC.SUGGESTION_LIMIT));
		var users = this._searchTable(SoC.SYS_USER, query, limit, this._gr.share_users + "");
		var groups = this._searchTable(SoC.GROUP, query, limit, this._gr.share_groups + "");
		var roles = this._searchTable(SoC.ROLE, query, limit, this._gr.share_roles + "");
		var suggestions = [];
		suggestions = suggestions.concat(users).concat(groups).concat(roles).sort(this._sort);

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[getSuggestions] suggestions: " + JSON.stringify(suggestions));

		return suggestions;
	},

	updateSchedule: function(changeSchedDef) {
		this._gr.name = changeSchedDef.name;
		this._gr.start_date_field = changeSchedDef.start_date_field;
		this._gr.end_date_field = changeSchedDef.end_date_field;
		this._gr.condition = changeSchedDef.condition;
		var updateSysId = this._gr.update();

		var result = {
			chg_soc_definition: this._gr.getUniqueValue(),
			name: { value: this._gr.name + "", display_value: this._gr.name.getDisplayValue() },
			start_date_field: { value: this._gr.start_date_field + "", display_value: this._gr.start_date_field.getDisplayValue() },
			end_date_field: { value: this._gr.end_date_field + "", display_value: this._gr.end_date_field.getDisplayValue() },
			condition: {value: this._gr.condition + "", display_value: this._gr.condition.getDisplayValue()},
			updated: false
		};

		if (updateSysId)
			result.updated = true;
		return result;
	},

	updatePermission: function(everyone) {
		this._gr.share_with = everyone;
		var updateSysId = this._gr.update();

		var result = {
			chg_soc_definition: this._gr.getUniqueValue(),
			shareWith: everyone,
			updated: false
		};

		if (updateSysId)
			result.updated = true;
		return result;
	},

	removePermission: function(tableName, sysId) {
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[removePermission] tableName: " + tableName + " sysId: " + sysId);

		switch (tableName) {
			case SoC.ROLE:
				this._gr.setValue("share_roles", this._removeElement((this._gr.share_roles + "").split(","), sysId));
				break;
			case SoC.GROUP:
				this._gr.share_groups = this._removeElement((this._gr.share_groups + "").split(","), sysId);
				break;
			case SoC.SYS_USER:
				this._gr.share_users = this._removeElement((this._gr.share_users + "").split(","), sysId);
				break;
			default:
				this._log.debug("[removePermission] tableName not supported");
		}

		if (this._gr.share_with + "" === "2" && this._gr.share_roles.nil() && this._gr.share_groups.nil() && this._gr.share_users.nil())
			this._gr.share_with = "";

		var updateSysId = this._gr.update() + "";
		var result = {
			chg_soc_definition: this._gr.getUniqueValue(),
			tableName: tableName,
			sys_id: sysId,
			removed: false
		};
		if (updateSysId)
			result.removed = true;
		return result;
	},

	deleteRecord: function() {
		var result = {
			chg_soc_definition: this._gr.getUniqueValue(),
			removed: this._gr.deleteRecord()
		};
		return result;
	},

	_isValidData: function(name, userSysId) {
		if (!name || !userSysId)
			return false;
		return true;
	},

	copy: function(name, userSysId) {
		name = (name + "").trim();
		var result = {
			chg_soc_definition: this._gr.getUniqueValue(),
			copied: false
		};

		if (!this._isValidData(name, userSysId)) {
			this._log.error("[copy] name: " + name + " and userSysId: " + userSysId + " are both mandatory parameters");
			result.error = this._gs.getMessage("Please provide a name for change schedule");
			return result;
		}

		var origSysId = this._gr.getUniqueValue();
		var definitionGr = SoCDefinition.findById(origSysId);
		if (!definitionGr) {
			this._log.error("[copy] Failed to find Change Schedule definition record by id: " + origSysId);
			result.error = this._gs.getMessage("Failed to copy change schedule");
			return result;
		}

		var elements = this._gr.getElements();
		var numElements = elements.length;
		for (var i = 0; i < numElements; i++) {
			var element = elements[i];
			var elementName = element.getName().toString();
			var elementValue = this._gr.getValue(elementName);

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug("[copy] elementName: " + elementName + " elementValue: " + elementValue);

			definitionGr.setValue(elementName, elementValue);
		}
		definitionGr.sys_scope = this._gs.getCurrentApplicationId();
		definitionGr.name = name;
		definitionGr.owner = userSysId;

		// Do not copy the sharing data
		definitionGr.share_with = "";
		definitionGr.share_users = "";
		definitionGr.share_groups = "";
		definitionGr.share_roles = "";
		definitionGr.group_owner = "";

		var copySysId = definitionGr.insert() + "";
		if (copySysId && copySysId !== origSysId) {
			result.chg_soc_definition = copySysId;
			result.chg_soc_definition_child = this._copy(origSysId, copySysId, SoC.DEFINITION_CHILD);
			result.chg_soc_definition_style_rule = this._copy(origSysId, copySysId, SoC.DEFINITION_STYLE_RULE);
			result.copied = true;
		} else {
			this._log.error("[copy] Failed to copy Change Schedule definition: " + origSysId);
			result.error = this._gs.getMessage("Failed to copy change schedule");
		}
		return result;
	},

	_copy: function (origSysId, copySysId, tableName) {
		var newRecSysIds = [];
		if (!origSysId || !copySysId || !tableName)
			return newRecSysIds;
		var gr = new GlideRecord(tableName);
		gr.addQuery(SoC.DEFINITION, origSysId);
		gr.query();
		while (gr.next()) {
			var newRecGr = new GlideRecord(tableName);
			newRecGr.initialize();
			var elements = gr.getElements();
			var numElements = elements.length;
			for (var i = 0; i < numElements; i++) {
				var element = elements[i];
				var elementName = element.getName().toString();
				var elementValue = gr.getValue(elementName);

				if (this._log.atLevel(global.GSLog.DEBUG))
					this._log.debug("[_copy] elementName: " + elementName + " elementValue: " + elementValue);

				newRecGr.setValue(elementName, elementValue);
			}
			newRecGr.sys_scope = this._gs.getCurrentApplicationId();
			newRecGr.chg_soc_definition = copySysId;
			newRecSysIds.push(newRecGr.insert() + "");
		}

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_copy] origSysId: " + origSysId + " copySysId: " + copySysId + " tableName: " + tableName + " newRecSysIds: " + newRecSysIds);

		return newRecSysIds;
	},

	_extractUserSysIds: function(recipients) {
		var userSysIds = [];
		recipients.forEach(function(recipient) {

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug("[_extractUserSysIds] tableName: " + recipient.tableName + " sysId: " + recipient.sys_id);

			switch (recipient.tableName) {
				case SoC.ROLE:
					var userSysIdsByRole = this._getUserByRole(recipient.sys_id);
					if (userSysIdsByRole.length > 0)
						userSysIds = userSysIds.slice().concat(userSysIdsByRole);
					break;
				case SoC.GROUP:
					var userSysIdsByGroup = this._getGroupEmails(recipient.sys_id);
					if (userSysIdsByGroup.length > 0)
						userSysIds = userSysIds.slice().concat(userSysIdsByGroup);
					break;
				case SoC.SYS_USER:
					if (recipient.sys_id)
						userSysIds.push(recipient.sys_id);
					break;
				default:
					this._log.debug("[_extractUserSysIds] Unsupported tableName");
			}
		}, this);
		return this._uniq(userSysIds);
	},

	_getUserByRole: function(roleSysId) {
		if (!roleSysId)
			return [];
		return this._getUserSysIds("sys_user_has_role", "role", roleSysId);
	},

	_getGroupEmails: function(groupSysId) {
		if (!groupSysId)
			return [];
		return this._getUserSysIds("sys_user_grmember", "group", groupSysId);
	},

	_getUserSysIds: function(tableName, field, sysId) {
		var userSysIds = [];
		if (!tableName || !field || !sysId)
			return userSysIds;
		var gr = new GlideRecord(tableName);
		gr.addQuery(field, sysId);
		gr.query();
		while (gr.next()) {
			var userSysId = gr.user + "";
			if (userSysId)
				userSysIds.push(userSysId);
		}
		return userSysIds;
	},

	getPermissions: function() {
		var sharing = {
			shareWith: "",
			shareGroups: "",
			shareUsers: "",
			shareRoles: ""
		};

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[getPermissions] this._gr.sys_id: " + this._gr.sys_id);

		if (!this._gr || (this._gr.sys_id + "" === ""))
			return sharing;

		sharing.shareWith = this._gr.share_with + "";
		sharing.shareGroups = this._getShareGroups();
		sharing.shareUsers = this._getShareUsers();
		sharing.shareRoles = this._getShareRoles();

		return sharing;
	},

	_getShareUsers: function() {
		var sharedUsers = this._gr.share_users + "";
		if (!sharedUsers)
			return [];
		return this._socUtil.getProfiles(SoC.SYS_USER, sharedUsers.split(","));
	},

	_getShareRoles: function() {
		var sharedRoles = this._gr.share_roles + "";
		if (!sharedRoles)
			return [];
		return this._socUtil.getProfiles(SoC.ROLE, sharedRoles.split(","));
	},

	_getShareGroups: function() {
		var sharedGroups = this._gr.share_groups + "";
		if (!sharedGroups)
			return [];
		return this._socUtil.getProfiles(SoC.GROUP, sharedGroups.split(","));
	},

	getStyleRules: function() {
		return new SoCDefinitionStyleRule(SoCDefinitionStyleRule.findByDefId(this._gr.getUniqueValue()), this._gs);
	},

	// Returns a gliderecord containing the changes for this definition
	getRecords: function(start, condition) {
		var changeGr = new GlideRecordSecure(SoC.CHANGE_REQUEST);
		changeGr.addNotNullQuery(this._gr.start_date_field + "");
		changeGr.addNotNullQuery(this._gr.end_date_field + "");
		if (!condition)
			condition = this._gr.condition + "";
		changeGr.addEncodedQuery(condition);
		if (condition.indexOf(SoC.ORDERBY) === -1)
			changeGr.orderBy(this._gr.start_date_field + "");
		changeGr.query();

		var pointer = 0;
		while (pointer < start && changeGr.next())
			pointer++;
		return changeGr;
	},

	_removeElement: function(arr, elem) {
		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_removeElement] arr: " + arr.join(",") + " elem: " + elem);

		// remove all instances of elem
		var index = arr.indexOf(elem);
		while (index !== -1) {
			arr.splice(index, 1);
			index = arr.indexOf(elem);
		}
		var arrStr = arr.join(",");

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_removeElement] arrStr: " + arrStr);

		return arrStr;
	},

	_searchTable: function(tableName, searchTerm, limit, ignoreList) {
		var searchResults = [];

		if (!tableName || !searchTerm)
			return searchResults;

		limit = limit || SoC.SUGGESTION_LIMIT;

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[_searchTable] tableName: " + tableName + " searchTerm: " + searchTerm + " limit: " + limit + " ignoreList: " + ignoreList);

		var gr = new GlideRecordSecure(tableName);
		gr.setLimit(limit);
		gr.addActiveQuery();
		if (ignoreList)
			(tableName === SoC.ROLE) ? gr.addQuery("name", "NOT IN", ignoreList) : gr.addQuery("sys_id", "NOT IN", ignoreList);
		gr.addQuery("name", "CONTAINS", searchTerm);
		gr.query();
		while (gr.next())
			searchResults.push(this._socUtil.getProfile(gr));
		return searchResults;
	},

	_chunkArray: function(arrayToBeChunked, chunkSize) {
		var arrayChunks = [];
		if (!arrayToBeChunked || arrayToBeChunked.length === 0)
			return arrayChunks;
		if (!chunkSize)
			chunkSize = 100;
		for (var i = 0; i < arrayToBeChunked.length; i += chunkSize)
			arrayChunks.push(arrayToBeChunked.slice(i, i + chunkSize));
		return arrayChunks;
	},

	sendEmail: function(message, recipients) {
		var userSysIds = this._extractUserSysIds(recipients);

		if (this._log.atLevel(global.GSLog.DEBUG))
			this._log.debug("[sendEmail] userSysIds: " + userSysIds.join(","));

		if (!userSysIds)
			return;

		// We can't use servlet.uri; during AHA transfers node restarts, its value can change. We use the override.url unless it's empty, then we revert to the servlet.uri.
		var instanceURL = this._gs.getProperty("glide.servlet.uri");
		var overrideURL = this._gs.getProperty("glide.email.override.url");
		var link = (overrideURL ? overrideURL : instanceURL + "nav_to.do") + "?uri=sn_chg_soc_change_soc.do%3Fsysparm_id%3D" + this._gr.sys_id;

		var anchor = "<a href='" + link + "'>" + this._gs.getMessage("View Change Schedule") + "</a>";
		var newLine = "<br>";
		message = message + newLine + anchor;
		var eventName = "sn_chg_soc.share.invitation";
		var emailMessage = {
			chgSocName: this._gr.name.getDisplayValue(),
			message: message
		};

		var recipientChunks = this._chunkArray(userSysIds, 100);
		for (var i = 0; i < recipientChunks.length; i++) {
			var userSysIdStr = recipientChunks[i].join(",");
			var emailMessageStr = JSON.stringify(emailMessage);
			this._gs.eventQueue(eventName, null, userSysIdStr, emailMessageStr);

			if (this._log.atLevel(global.GSLog.DEBUG))
				this._log.debug("[sendEmail] chunk: " + i + " userSysIdStr: " + userSysIdStr + " emailMessageStr: " + emailMessageStr);
		}
	},

	_uniq: function(arr) {
			var hash = {};
			return arr.filter(function(elem) {
					return hash.hasOwnProperty(elem) ? false : (hash[elem] = true);
			});
	},

	_updatePermission: function(recipients) {
		var roleSysIds = [];
		var groupSysIds = [];
		var userSysIds = [];

		recipients.forEach(function(recipient) {
			switch (recipient.tableName) {
				case SoC.ROLE:
					roleSysIds.push(recipient.sys_id);
					break;
				case SoC.GROUP:
					groupSysIds.push(recipient.sys_id);
					break;
				case SoC.SYS_USER:
					userSysIds.push(recipient.sys_id);
					break;
				default:
					this._log.debug("[_updatePermission] Unsupported tableName");
			}
		});

		roleSysIds = this._uniq(roleSysIds.concat((this._gr.share_roles + "").split(",")));
		groupSysIds = this._uniq(groupSysIds.concat((this._gr.share_groups + "").split(",")));
		userSysIds = this._uniq(userSysIds.concat((this._gr.share_users + "").split(",")));

		if (roleSysIds.length > 0 || groupSysIds.length > 0 || userSysIds.length > 0) {
			if (this._gr.share_with.nil())
				this._gr.share_with = 2;
			this._gr.setValue("share_roles", roleSysIds.join(","));
			this._gr.share_groups = groupSysIds.join(",");
			this._gr.share_users = userSysIds.join(",");
		}
		else if (this._gr.share_with + "" === "2")
			this._gr.share_with = "";
		return this._gr.update() + "";
	},

	type: "SoCDefinitionSNC"
});

SoCDefinitionSNC.findById = function(socDefId) {
	if (!socDefId)
		return null;
	var definitionGr = new GlideRecordSecure(SoC.DEFINITION);
	if (!definitionGr.get(socDefId))
		return null;

	return definitionGr;
};

// Finds all the definitions the current user has access to
SoCDefinitionSNC.findAll = function(orderBy, textSearch) {
	if (!orderBy)
		orderBy = SoC.NAME;

	var socDefGr = new GlideRecordSecure(SoC.DEFINITION);
	socDefGr.addActiveQuery();
	if (textSearch !== undefined && textSearch !== "undefined" && textSearch.trim() !== "")
		socDefGr.addQuery(SoC.NAME, "CONTAINS", textSearch).addOrCondition(SoC.OWNER + "." + SoC.NAME, "CONTAINS", textSearch);
	socDefGr.orderBy(orderBy);
	socDefGr.query();
	return socDefGr;
};

SoCDefinitionSNC.findPinned = function(orderBy, textSearch) {
	var socDefGr = new GlideRecordSecure(SoC.DEFINITION);
	if (!orderBy)
		orderBy = SoC.NAME;
	var pinnedDefPref = gs.getUser().getPreference("com.snc.soc.landing_page.pinned_schedules");
	var pinnedDefIds = pinnedDefPref ? pinnedDefPref.split(",") : [];

	socDefGr.addActiveQuery();
	if (textSearch !== undefined && textSearch !== "undefined" && textSearch.trim() !== "")
		socDefGr.addQuery(SoC.NAME, "CONTAINS", textSearch).addOrCondition(SoC.OWNER + "." + SoC.NAME, "CONTAINS", textSearch);
	socDefGr.addQuery("sys_id", "IN", pinnedDefIds);
	socDefGr.orderBy(orderBy);
	socDefGr.query();
	return socDefGr;
};

SoCDefinitionSNC.findOwned = function(orderBy, textSearch) {
	if (!orderBy)
		orderBy = SoC.NAME;

	var grpMemGr = new GlideRecord("sys_user_grmember");
	grpMemGr.addQuery(SoC.USER, gs.getUser().getID());
	grpMemGr.query();

	var groups = [];
	while (grpMemGr.next())
		groups.push(grpMemGr.group + "");

	var socDefGr = new GlideRecordSecure(SoC.DEFINITION);
	socDefGr.addActiveQuery();
	if (textSearch !== undefined && textSearch !== "undefined" && textSearch.trim() !== "")
		socDefGr.addQuery(SoC.NAME, "CONTAINS", textSearch).addOrCondition(SoC.OWNER + "." + SoC.NAME, "CONTAINS", textSearch);
	socDefGr.addQuery(SoC.OWNER, gs.getUser().getID()).addOrCondition(SoC.GROUP_OWNER, "IN", groups);
	socDefGr.orderBy(orderBy);
	socDefGr.query();
	return socDefGr;
};

SoCDefinitionSNC.getRequiredFields = function(socDefGr) {
	if (!socDefGr)
		return null;

	var requiredFields = {};

	for (var field in SoC.JS_INCLUDE)
		if (SoC.JS_INCLUDE.hasOwnProperty(field))
			requiredFields[field] = true;

	requiredFields[socDefGr.start_date_field + ""] = true;
	requiredFields[socDefGr.end_date_field + ""] = true;
	if ("chg_soc_definition_child" === socDefGr.sys_class_name + "")
		requiredFields[socDefGr.reference_field + ""] = true;

	var popoverFields = (socDefGr.popover_left_col_fields + "");
	popoverFields += "," + (socDefGr.popover_right_col_fields + "");
	popoverFields = popoverFields.split(",");
	for (var i = 0; i < popoverFields.length; i++)
		if (popoverFields[i])
			requiredFields[popoverFields[i]] = true;

	return requiredFields;
};

```