---
title: "OnCallEscalationSNC"
id: "oncallescalationsnc"
---

API Name: global.OnCallEscalationSNC

```js
var OnCallEscalationSNC = Class.create();
OnCallEscalationSNC.prototype = {
	TABLES: {
		CMN_ROTA: 'cmn_rota',
		CMN_ROTA_ROSTER: 'cmn_rota_roster'
	},

	initialize: function () {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
		this.clear();
	},

	clear: function() {
		this.rotaList = [];
		this.entries = {};
		this.entryKeys = [];
		this.entryKeyIndex = 0;
		this.groupSysId = "";
		this.rotaSysIds = [];
		this.timeZone = "";
		this.notifiedList = [];
		this.firstNotifiedGdt = null;
		this.primaryUserSysId = "";
		this.primaryUserName = "";
		this.primaryUsers = {};
	},

	addRotaToList: function(rotaSysId) {
		if (rotaSysId)
			this.rotaList.push(rotaSysId);
	},

	getRotaList: function() {
		return this.rotaList;
	},

	isInRotaList: function(rotaSysId) {
		var inList = this.rotaList.indexOf(rotaSysId) !== -1;

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[isInRotaList] inList: " + inList);

		return inList;
	},

	getEntries: function() {
		return this.entries;
	},

	setGroupID: function(groupSysId) {
		this.groupSysId = groupSysId;
	},

	getGroupID: function() {
		return this.groupSysId;
	},

	setRotaID: function(rotaSysId) {
		this.rotaSysIds = [rotaSysId];
	},

	setRotaIDs: function(rotaSysIds) {
		this.rotaSysIds = rotaSysIds;
	},

	addRotaID: function(rotaSysId) {
		this.rotaSysIds.push(rotaSysId);
	},

	getRotaID: function() {
		return this.rotaSysIds[0];
	},

	getRotaIDs: function() {
		return this.rotaSysIds;
	},

	setTimeZone: function(timeZone) {
		this.timeZone = timeZone;
	},

	getTimeZone: function() {
		return this.timeZone;
	},

	setPrimaryUserID: function (userSysId, rotaId, rosterId) {
		if (userSysId) {
			this.primaryUserSysId = userSysId;
			var user = GlideUser.getUserByID(userSysId);
			if (user)
				this.primaryUserName = user.getDisplayName();
			else
				this.primaryUserName = "";
			if(rotaId) {
				this.primaryUsers[rotaId] = {
					userSysId: userSysId,
					userName: this.primaryUserName,
					rosterId: rosterId
				};
			}
		}
	},

	addPrimaryUserID: function(userSysId, rotaId, rosterId) {
		if (userSysId) {
			var user = GlideUser.getUserByID(userSysId);
			var primaryUserName = "";
			if (user)
				primaryUserName = user.getDisplayName();
			if(rotaId) {
				this.primaryUsers[rotaId] = {
					userSysId: userSysId,
					userName: primaryUserName,
					rosterId: rosterId
				};
			}
		}
	},

	getPrimaryUserID: function() {
		return this.primaryUserSysId;
	},

	getPrimaryUsers: function() {
		return this.primaryUsers;
	},

	getPrimaryUserIdByRota: function(rotaId) {
		return this.primaryUsers[rotaId] ? this.primaryUsers[rotaId].userSysId : "";
	},

	getPrimaryUserName: function() {
		return this.primaryUserName;
	},

	getPrimaryUserNameByRota: function(rotaId) {
		return this.primaryUsers[rotaId] ? this.primaryUsers[rotaId].userName : "";
	},

	getFirstNotified: function() {
		return this.firstNotifiedGdt;
	},

	/**
	 * Add an escalation entry - delay indicates the time from the first escalation until this escalation
	 */
	add: function(onCallEscalationEntry) {
		// Make sure that the entries stay in delay order, and ensure no duplicates
		var delay = parseInt(this.createKey(onCallEscalationEntry.getDelay()));

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[add] delay: " + delay);

		if (this.entries[delay]) {
			var index = this.entryKeys.indexOf(delay);
			this.entryKeys.splice(index, 1);
		}

		this.entryKeys.splice(this._getSortedIndex(this.entryKeys, delay), 0, delay);

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[add] this.entryKeys: " + this.entryKeys.join(","));

		this.entries[delay] = onCallEscalationEntry;
	},

	/**
	 * Position to the start of the escalation list
	 */
	gotoTop: function() {
		this.entryKeyIndex = -1;
		return this.hasNext();
	},

	hasNext: function() {
		return this.entryKeyIndex + 1 < this.entryKeys.length;
	},

	size: function() {
		return this.entryKeys.length;
	},

	next: function() {
		if (this.hasNext())
			return this.entries[this.entryKeys[++this.entryKeyIndex]];
		return null;
	},

	/**
	 * Determine the time when we should run the first escalation that is in the future
	 */
	runAt: function() {
		var nowMS = new GlideDateTime().getNumericValue();
		var runAtValue = -1;
		this.entryKeys.some(function(key) {
			var _runAtValue = this.entries[key].getRunAt();
			var found = _runAtValue > nowMS;

			if (this.log.atLevel(GSLog.DEBUG))
				this.log.debug("[runAt] _runAtValue: " + _runAtValue + " nowMS: " + nowMS + " found: " + found);

			if (found)
				runAtValue = _runAtValue;
			return found;
		}, this);
		return runAtValue;
	},

	/**
	 * add current escalation to the notified list by setting the notified time
	 */
	addToNotified: function(onCallEscalationEntry) {
		// set the notified time in the pending entries list as this will keep us from writing it twice
		var nowGdt = new GlideDateTime();
		this.entryKeys.some(function(key) {
			var entry = this.entries[key];
			var found = onCallEscalationEntry.sameNotify(entry);
			if (found)
				entry.setNotifiedTime(nowGdt);
			return found;
		}, this);
		onCallEscalationEntry.setNotifiedTime(nowGdt);
		this.notifiedList.push(onCallEscalationEntry);
	},

	/**
	 * Save the escalation entries as xml
	 */
	toXml: function(allEntries) {
		var doc = GlideXMLUtil.newDocument("escalations");

		var root = doc.getDocumentElement();
		root.setAttribute("group", this.groupSysId);
		root.setAttribute("current_rota", this.rotaSysIds.join(","));
		root.setAttribute("processed_rota_list", this.rotaList.join(","));
		root.setAttribute("primary_user_id", this.primaryUserSysId);
		root.setAttribute("primary_user_name", this.primaryUserName);

		var notifications = doc.createElement("notifications");
		root.appendChild(notifications);

		// Record those already notified
		for (var i = 0, length = this.notifiedList.length; i < length; i++)
			this.notifiedList[i].toXml(doc, notifications);

		var nowMS = new GlideDateTime().getNumericValue();
		this.entryKeys.forEach(function(key) {
			var entry = this.entries[key];
			if (allEntries || (entry.getRunAt() > nowMS)) {
				if (entry.getNotifiedTime() == null)
					entry.toXml(doc, notifications);
			}
		}, this);
		return doc;
	},

	/**
	 * Load up the escalation information from the xml string
	 */
	fromXml: function(escalationXmlStr) {
		this.clear();
		if (!escalationXmlStr)
			return;
		var doc = GlideXMLUtil.parse(escalationXmlStr);
		if (!doc)
			return;

		var root = doc.getDocumentElement();
		this.groupSysId = root.getAttribute("group");
		this.rotaSysIds = [];
		var rotaSysIds = root.getAttribute("current_rota").split(",");
		var k;
		for (k = 0; k < rotaSysIds.length; k++) {
			this.rotaSysIds.push(rotaSysIds[k] + "");
		}
		this.primaryUserSysId = root.getAttribute("primary_user_id");
		this.primaryUserName = root.getAttribute("primary_user_name");
		this.rotaList = [];
		var rotaList = root.getAttribute("processed_rota_list").split(",");
		for (k = 0; k < rotaList.length; k++) {
			this.rotaList.push(rotaList[k]);
		}

		var pending = GlideXMLUtil.selectNodes(root, "/escalations/notifications/" + OnCallEscalationEntrySNC.PENDING);
		for (var i = 0, length = pending.getLength(); i < length; i++) {
			var pendingEntry = new OnCallEscalationEntry();
			pendingEntry.fromXml(pending.item(i));
			var key = this.createKey(pendingEntry.getDelay());
			this.entries[key] = pendingEntry;
			this.entryKeys.push(key);
		}

		var sent = GlideXMLUtil.selectNodes(root, "/escalations/notifications/" + OnCallEscalationEntrySNC.SENT);
		var sentLength = sent.getLength();
		for (var j = 0; j < sentLength; j++) {
			var sentEntry = new OnCallEscalationEntry();
			sentEntry.fromXml(sent.item(j));
			this.notifiedList.push(sentEntry);
			if (j === 0)
				this.firstNotifiedGdt = new GlideDateTime(sentEntry.getNotifiedTime());
		}

		// Start the iterator at the beginning of the list
		this.gotoTop();
	},

	/**
	 * Generate string representation of all On Call Escalation entries
	 *
	 * return: [string] OnCallEscalationSNCNotification instance
	 */
	toString: function() {
		var rv = "pending={";
		this.entryKeys.forEach(function(key) {
			var entry = this.entries[key];
			rv += "\n" + entry.toString();
		}, this);

		rv += "}\nsent={";

		this.notifiedList.forEach(function(notifiedEntry) {
			rv += "\n" + notifiedEntry.toString();
		}, this);

		rv += "}";
		return rv;
	},

	/**
	 * Create a unique sequenced key for storing the escalation entries in our list
	 */
	createKey: function(value) {
		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[createKey] param value: " + value);

		value *= 100000;
		value += this.entryKeys.length;

		if (this.log.atLevel(GSLog.DEBUG))
			this.log.debug("[createKey] return value: " + value);

		return value;
	},

	/**
	 * Return the escalation type of a rota based on:
	 * - If there's more than one active roster, return rotate through rosters
	 * - If there's only one active roster, return rotate through members
	 * - Otherwise return message indicating missing rosters
	 *
	 * rotaSysId: [string] sys_id of rota
	 * return: [string] escalation type
	 */
	getEscalationType: function(rotaSysId) {
		var type = "The specified rota does not contain any active rosters";
		if (!rotaSysId)
			return type;

		var rotaGr = new GlideRecord(this.TABLES.CMN_ROTA);
		if(rotaGr.get(rotaSysId) && rotaGr.getValue('use_custom_escalation') == 1)
			return 'custom';

		var rosterGa = new GlideAggregate(this.TABLES.CMN_ROTA_ROSTER);
		rosterGa.addAggregate("COUNT");
		rosterGa.addActiveQuery();
		rosterGa.addQuery("rota", rotaSysId);
		rosterGa.query();
		var count = 0;
		if (rosterGa.next())
			count = parseInt(rosterGa.getAggregate("COUNT"));

		if (count === 1)
			type = "member";
		else if (count > 1)
			type = "roster";
		return type;
	},

	_getSortedIndex: function(array, value) {
		var low = 0,
		high = array.length;

		while (low < high) {
			var mid = (low + high) >>> 1;
			if (array[mid] < value)
				low = mid + 1;
			else
				high = mid;
		}
		return low;
	},

	type: "OnCallEscalationSNC"
};

```