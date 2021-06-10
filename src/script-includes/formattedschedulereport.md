---
title: "FormattedScheduleReport"
id: "formattedschedulereport"
---

API Name: global.FormattedScheduleReport

```js
var FormattedScheduleReport = Class.create();
FormattedScheduleReport.UTC_DATE_FORMAT = "yyyy-MM-dd HH:mm:ss";
FormattedScheduleReport.UTC_TIME_FORMAT = "HH:mm:ss";
FormattedScheduleReport.prototype = {

	initialize: function (timeZone) {
		this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);

		this.arrayUtil = new ArrayUtil();
		this.userInfo = {};
		this.daysToReport = [];

		this.schedule = {
			groups: {}
		};

		this.shiftTimeslots = {
			rotas: {}
		};

		this.rosterPerRota = {
			rotas: {}
		};

		this.timeZone = gs.getSession().getTimeZoneName();
		if (timeZone)
			this.timeZone = timeZone;
	},

	isPublic: function () {
		return false;
	},

 	/**
 	* If the high security settings plugin is turned on this will returns groups that
 	* the current user has the rights to view
 	*/
	getPermittedGroups: function (commaSeparatedGroups) {
		this.log.debug("[getPermittedGroups] commaSeparatedGroups: " + commaSeparatedGroups);

		var permittedGroups;

		// high security is on so we can allow access to all groups
		if (!pm.isRegistered("com.glide.high_security"))
			permittedGroups = commaSeparatedGroups;
		else {
			var ocsng = new OnCallSecurityNG();
			var permittedGroupIds = [];
			var groupIds = commaSeparatedGroups.split(',');
			for (var i = 0; i < groupIds.length; i++)
				if (ocsng.rotaAccess(groupIds[i]))
					permittedGroupIds.push(groupIds[i]);
			permittedGroups = permittedGroupIds.join();
		}
		this.log.debug("[getPermittedGroups] permittedGroups: " + permittedGroups);
		return permittedGroups;
	},

	/**
	 * start [GlideDateTime / String]
	 * return GlideScheduleDateTime
	 */
	getStartDate: function(start) {
		var startGSDT = new GlideScheduleDateTime(start);
		startGSDT.setTimeZone(this.timeZone);
		startGSDT.setBeginningOfDay();
		return startGSDT;
	},

	/**
	 * end [GlideDateTime / String]
	 * return GlideScheduleDateTime
	 */
	getEndDate: function(end) {
		var endGSDT = new GlideScheduleDateTime(end);
		endGSDT.setTimeZone(this.timeZone);
		endGSDT.setEndOfDay();
		return endGSDT;
	},

	/*
	* Generates the data structure containing the schedule of the groups that user is authorized to see
	* in the period of start and end date
	*/
	buildSchedule: function (groups, startAsString, endAsString, rotaID) {
		this.log.debug("[buildSchedule] groups: " + groups + " startAsString: " + startAsString + " endAsString: " + endAsString + " rotaID: " + rotaID);

		//Add time part if it is missing
		var start = this.getStartDate(startAsString);
		var end = this.getEndDate(endAsString);

		var rotaGR = new GlideRecord("cmn_rota");
		rotaGR.addQuery('group', 'IN', this.getPermittedGroups(groups));
		rotaGR.query();

		if (typeof rotaID === 'undefined') {
			while (rotaGR.next())
				this.buildData(rotaGR, start, end);
		} else if (rotaGR.get(rotaID))
			this.buildData(rotaGR, start, end);

	},

	buildData: function (rotaGR, start, end) {
		this.log.debug("[buildData] start: " + start + " end: " + end);

		var tempStart = this.getStartDate(start);
		var tempEnd = this.getEndDate(start);
		tempEnd.addSeconds(-1);

		var rotaId = rotaGR.getUniqueValue();
		var rotaName = rotaGR.getValue('name');
		var groupId = rotaGR.group + "";

		this.log.debug("[buildData] rotaId: " + rotaId + " rotaName: " + rotaName + " groupId: " + groupId);

		//Go forward day by day and get the schedule for the day
		while (gs.dateDiff(tempEnd.getGlideDateTime(), end.getGlideDateTime(), true) >= 0) {
			var page = new GlideAJAXSchedulePage(tempStart, tempEnd, this.timeZone);
			var rotationCalc = new OnCallRotationCalculator();
			rotationCalc.setPage(page);
			rotationCalc.limitRotaId(rotaId);
			rotationCalc.run(groupId);
			var items = rotationCalc.page.getItems();

			this.log.debug("[buildData] items.size: " + items.size() + " items: " + items);

			// Extract data from each time slot and add them to the schedule object
			for (var i = 0; i < items.size(); i++) {
				var ajaxScheduleItem = items.get(i);
				var type = ajaxScheduleItem.getDataByKey("type");
				var roster = ajaxScheduleItem.getDataByKey("roster");
				var spans = ajaxScheduleItem.getTimeSpans();

				this.log.debug("[buildData] ajaxScheduleItem: " + ajaxScheduleItem + " type: " + type + " roster: " + roster + " spans: " + spans);

				// Ignore the roster type record as it is a summary of rotations
				if (type != "roster" && spans.size() > 0) {
					var userId = ajaxScheduleItem.getDataByKey("user");

					for (var k = 0; k < spans.size(); k++) {
						var beginShift = this._getTimeDisplayFromScheduleDateTime(spans.get(k).getStart());
						var endShift = this._getTimeDisplayFromScheduleDateTime(spans.get(k).getEnd());
						this.addScheduleEntry(groupId, rotaId, tempStart, beginShift, endShift, roster, userId, rotaName);
					}
				}
			}

			// Updating loop variables
			tempStart = new GlideScheduleDateTime(tempEnd);
			tempStart.setTimeZone(this.timeZone);
			tempStart.addSeconds(1);
			tempEnd.addDays(1);
		}
	},

	/*
	* Generates the data structure containing the schedule of the groups that user is authorized to see
	* in the period of start and end date
	*/
	buildScheduleEmail: function (groups, startGDT, endGDT, rotaID) {
		this.log.debug("[buildScheduleEmail] groups: " + groups + " startGDT: " + startGDT + " endGDT: " + endGDT + " rotaID: " + rotaID);

		//Add time part if it is missing
		var start = this.getStartDate(startGDT);
		var end = this.getEndDate(endGDT);

		var rotaGR = new GlideRecord("cmn_rota");
		rotaGR.addQuery('group', 'IN', this.getPermittedGroups(groups));
		rotaGR.query();

		if (typeof rotaID === 'undefined') {
			while (rotaGR.next())
				this.buildDataEmail(rotaGR, start, end);
		} else if (rotaGR.get(rotaID))
			this.buildDataEmail(rotaGR, start, end);
	},

	/*
	 * Generates the data structure containing the schedule of the rota for resending email reminders
	 * @param GlideRecord rotaGR (rota GlideRecord)
	 * @param String start (asDisplayed)
	 * @param String end (asDisplayed)
	 */
	buildDataEmail: function (rotaGR, start, end) {
		var endSDT = new GlideScheduleDateTime(end);
		endSDT.setTimeZone(this.timeZone);
		endSDT.setEndOfDay();
		endSDT.addSeconds(-1);

		if (rotaGR) {
			var tempStart = new GlideScheduleDateTime(start);
			tempStart.setTimeZone(this.timeZone);
			tempStart.setBeginningOfDay();

			var tempEnd = new GlideScheduleDateTime(start);
			tempEnd.setTimeZone(this.timeZone);
			tempEnd.setEndOfDay();
			tempEnd.addSeconds(-1);

			var rotaId = rotaGR.getUniqueValue();
			var rotaName = rotaGR.getValue('name');
			var groupId = rotaGR.group + "";

			while (gs.dateDiff(tempEnd.toString(), endSDT.toString(), true) >= 0) {
				var page = new GlideAJAXSchedulePage(tempStart, tempEnd, this.timeZone);
				var rotationCalc = new OnCallRotationCalculator();
				rotationCalc.setPage(page);
				rotationCalc.limitRotaId(rotaId);
				rotationCalc.run(groupId);
				var items = rotationCalc.page.getItems();

				for (var i = 0; i < items.size(); i++) {
					var ajaxScheduleItem = items.get(i);
					var type = ajaxScheduleItem.getDataByKey("type");
					var roster = ajaxScheduleItem.getDataByKey("roster");
					var spans = ajaxScheduleItem.getTimeSpans();

					if (type != "roster" && spans.size() > 0) {
						var userId = ajaxScheduleItem.getDataByKey("user");

						for (var k = 0; k < spans.size(); k++) {
							var beginShift = this._getTimeValueFromScheduleDateTime(spans.get(k).getStart());
							var endShift = this._getTimeValueFromScheduleDateTime(spans.get(k).getEnd());
							this.addScheduleEntry(groupId, rotaId, tempStart.toString(), beginShift, endShift, roster, userId, rotaName);
						}
					}
				}

				// Update tempStart and tempEnd for the next day
				// Constructs new GlideScheduleDateTime using GlideScheduleDateTime(GlideScheduleDateTime sdt) constructor.
				tempStart = new GlideScheduleDateTime(tempEnd);
				tempStart.setTimeZone(this.timeZone);
				tempStart.addSeconds(1);
				tempEnd.addDays(1);
			}
		}

	},

	_dateObjToString: function(date) {
		if (typeof date == 'undefined' || !date)
			return "";

		if (typeof date == 'object') {
			if (typeof date.getDisplayValue == 'function')
				date = date.getDisplayValue();
			else if (typeof date.toString == 'function') {
				var dateObj = new GlideDateTime();
				//setDisplay and getDisplay must always be used together for 0 conversion.
				dateObj.setDisplayValue(date);
				//date must be returned as display value in this function to support user format.
				date = dateObj.getDisplayValue();
			}
		}
		return date;
	},

	/*
	* Populates the schedule object with the passed info
	*/
	addScheduleEntry: function (groupId, rotaId, day, startShift, endShift, rosterId, userId, rotaName) {
		this.log.debug("[addScheduleEntry] groupId: " + groupId + " rotaId: " + rotaId + " day: " + day + " startShift: " + startShift + " endShift: " + endShift + " rosterId: " + rosterId + " userId: " + userId + " rotaName: " + rotaName);

		//check if the group entry exists
		if (this.schedule.groups.length == 0 || typeof this.schedule.groups[groupId] == "undefined")
			this.schedule.groups[groupId] = {
			rotas: {}
		};

		if (this.schedule.groups[groupId].rotas.length == 0 || typeof this.schedule.groups[groupId].rotas[rotaId] == "undefined") {
			this.schedule.groups[groupId].rotas[rotaId] = {
				days: {}
			};
			// Also update timespan def, the default value of used is false and we only set it to true if there is a user working in that timeslot for the given rota, this way we avoid rep[orting empty timeslots
			this.shiftTimeslots.rotas[rotaId] = {
				used: false,
				name: rotaName,
				timespans: []
			};
			this.rosterPerRota.rotas[rotaId] = {
				rosters: {}
			};
		}

		day = this._dateObjToString(day);

		if (this.schedule.groups[groupId].rotas[rotaId].days.length == 0 ||
			typeof this.schedule.groups[groupId].rotas[rotaId].days[day] == "undefined") {

			this.schedule.groups[groupId].rotas[rotaId].days[day] = {
				timeslots: {}
			};

			if (!this.arrayUtil.contains(this.daysToReport, day)) {
				this.daysToReport.push(day);
				this.daysToReport.sort(this._dateComparator);
			}
		}

		var period = startShift + "," + endShift;

		if (this.schedule.groups[groupId].rotas[rotaId].days[day].timeslots.length == 0 ||
			typeof this.schedule.groups[groupId].rotas[rotaId].days[day].timeslots[period] == "undefined") {
			this.schedule.groups[groupId].rotas[rotaId].days[day].timeslots[period] = {
				rosters: {}
			};

			// Also update timespan definition
			if (!this.arrayUtil.contains(this.shiftTimeslots.rotas[rotaId].timespans, startShift)) {
				this.shiftTimeslots.rotas[rotaId].timespans.push(startShift);
				this.shiftTimeslots.rotas[rotaId].used = true;
			}

			if (!this.arrayUtil.contains(this.shiftTimeslots.rotas[rotaId].timespans, endShift))
				this.shiftTimeslots.rotas[rotaId].timespans.push(endShift);

			this.shiftTimeslots.rotas[rotaId].timespans.sort();
		}

		if (!this.schedule.groups[groupId].rotas[rotaId].days[day].timeslots[period].rosters[rosterId])
			this.schedule.groups[groupId].rotas[rotaId].days[day].timeslots[period].rosters[rosterId] = userId;
		//Update roster info
		if (userId && (!this.rosterPerRota.rotas[rotaId].rosters[rosterId] || this.rosterPerRota.rotas[rotaId].rosters[rosterId] == "undefined")) {
			var currentRoster = new GlideRecord('cmn_rota_roster');
			currentRoster.get(rosterId);
			this.rosterPerRota.rotas[rotaId].rosters[rosterId] = {
				name: currentRoster.getValue('name'),
				order: currentRoster.getValue("order"),
				id: rosterId
			};
		}
		//Update User info
		if (!this.userInfo[userId] || this.userInfo[userId] == "undefined") {
			var glideUser = GlideUser.getUserByID(userId);
			var userName = glideUser.getFullName();
			var availablePhoneNumbers = new SNC.UserNotificationDevices(glideUser.getID()+"").getCurrentlyAvailableVoiceDevices();
			var phoneNumber = (availablePhoneNumbers.length > 0 ? availablePhoneNumbers[0].getNumber() : "");
			this.userInfo[userId] = {
				name: userName,
				phone: phoneNumber
			};
		}
	},

	/*
	* Retrieves the userId of the on-call memeber working in the given point of time
	* in the given rota, returns empty srting if it doesn't find anyone
	*/
	findUser: function (group, rota, day, roster, from, to) {
		// Find the the timeslot of the given group, rota for the given day which includes the input timeslot
		for (var t in this.schedule.groups[group].rotas[rota].days[day].timeslots) {
			var tss = this.getIncludingTimeSlots(t, rota);

			if (this.arrayUtil.contains(tss, from) && this.arrayUtil.contains(tss, to)) {
				if (typeof this.schedule.groups[group].rotas[rota].days[day].timeslots[t].rosters[roster] != "undefined") {
					return this.schedule.groups[group].rotas[rota].days[day].timeslots[t].rosters[roster] + "";
				}
			}
		}
		return "";
	},

	/*
	* Returns an array of time points that are inside the given timeslot for the passed rota
	*/
	getIncludingTimeSlots: function (timeslot, rotaId) {
		var result = [];
		var ends = timeslot.split(',');
		this.log.debug('[getIncludingTimeSlots] ends before sort: ' + ends);
		ends.sort();
		// ends.sort(this._timeComparator);
		this.log.debug('[getIncludingTimeSlots] ends after sort: ' + ends);

		if (ends.length == 2) {
			var fromIdx = this.arrayUtil.indexOf(this.shiftTimeslots.rotas[rotaId].timespans, ends[0]);
			var toIdx = this.arrayUtil.indexOf(this.shiftTimeslots.rotas[rotaId].timespans, ends[1]);
			for (var i = fromIdx; i <= toIdx; i++)
				result.push(this.shiftTimeslots.rotas[rotaId].timespans[i]);
		}
		return result;
	},

	/*
	 * Returns the day name given a date in user defined format. AjaxSchedulePage returns results in user time format.
	 * It is immaterial to consider tz as we in this case need to parse the date and get day of week.
	 * Hence getting day of week in UTC after setting in UTC the received date in user defined format.
	 */
	getDayOfWeek: function(dateInUserDateTimeFormat) {
		var gdt = new GlideDateTime();
		gdt.setValueUTC(dateInUserDateTimeFormat, gs.getDateTimeFormat());
		switch (gdt.getDayOfWeekUTC()) {
			case 1:
			return gs.getMessage("Monday");
			case 2:
			return gs.getMessage("Tuesday");
			case 3:
			return gs.getMessage("Wednesday");
			case 4:
			return gs.getMessage("Thursday");
			case 5:
			return gs.getMessage("Friday");
			case 6:
			return gs.getMessage("Saturday");
			case 7:
			return gs.getMessage("Sunday");
		}
	},

	/*
 	* @param Object rosters  - containing key-value pairs like  'rosterIndex' : { name : 'rosterName', order : 'rosterOrder', id : 'rosterID'}
 	* @return array of objects { name : 'rosterName', order : 'rosterOrder', id : 'rosterID'} sorted by order value ascendingy
 	*/
	sortRosters: function (rosters) {
		var rostersArray = [];
		for (var r in rosters) {
			rostersArray.push(rosters[r]);
		}
		rostersArray.sort(function (a, b) {
			return a.order - b.order;
		});
		return rostersArray;
	},

	/*
	* Renders the schedule object as a html table
	*/
	getReport: function () {
		return this.getHTML(false);
	},

	/*
	* @param String time1 (asDisplayed)
	* @param String time1 (asDisplayed)
	* @return boolean
	*/
	isOneSecondDifference: function (time1, time2) {
		var duration1 = new GlideDuration(time1);
		var duration2 = new GlideDuration(time2);
		var difference = new GlideDateTime(duration2.subtract(duration1)).getNumericValue();

		// if the subtracted durations is not 1000 milliseconds (1 second)
		if (difference != 1000)
			return false;
		return true;
	},

	/*
	* Renders the schedule object as a html table
	* @param boolean purposeOfReminder - true if getHTML is called for the purpose of sending on-call email reminder
	*/
	getHTML: function (purposeOfReminder) {
		var header = "";
		var table = "";
		var tableRow = "";
		var flushTableRow = true;
		var makeHeader = true;

		this.log.debug("[purposeOfReminder] groups: " + JSON.stringify(this.schedule.groups));

		for (var g in this.schedule.groups) {
			var group = GlideGroup.get(g);
			var title = gs.getMessage("On-Call Schedules");
			if (Object.keys(this.schedule.groups).length == 1)
				title = gs.getMessage("{0} On-Call Schedule", group.getName());

			if (makeHeader)
				header = "<th align='center'>" + title + "</th><th align='center'>" + gs.getMessage("Roster") + "</th><th align='center'>" + gs.getMessage("Shift") + "</th>";

			for (var r in this.schedule.groups[g].rotas) {
				var noOfRosterForRota = 0;
				for (var prop in this.rosterPerRota.rotas[r].rosters)
					if (this.rosterPerRota.rotas[r].rosters.hasOwnProperty(prop))
					noOfRosterForRota++;

				var rotaPlaceHolder = '$';

				tableRow += "<td rowspan='" + rotaPlaceHolder + "'>" + this.shiftTimeslots.rotas[r].name + "</td>";

				var sortedRosters = this.sortRosters(this.rosterPerRota.rotas[r].rosters);

				//Loop through the rosters
				for (var rosterIndex in sortedRosters) {
					// To deal with empty rows we need to postpone giving the rowspan values until we know how many rows we hide
					var noRowsToHide = 0;
					var roster = sortedRosters[rosterIndex].id;
					var rosterPlaceHolder = '@';

					tableRow += "<td rowspan='" + rosterPlaceHolder + "'>" + this.rosterPerRota.rotas[r].rosters[roster].name + "</td>";
					for (var j = 1; j < this.shiftTimeslots.rotas[r].timespans.length; j++) {

						var isEmptyRow = true;
						var isOneSecond = false;
						for (var k = 0; k < this.daysToReport.length; k++) {
							var d = this.daysToReport[k];
							if (makeHeader)
								header += "<th align='center'>" + d.split(" ")[0] + "<br></br>" + this.getDayOfWeek(d) + "</th>";

							if (k == 0) {
								isOneSecond = this.isOneSecondDifference(this.shiftTimeslots.rotas[r].timespans[j - 1], this.shiftTimeslots.rotas[r].timespans[j]);
								if (!isOneSecond)
									tableRow += "<td>" + this.shiftTimeslots.rotas[r].timespans[j - 1] + "-" + this.shiftTimeslots.rotas[r].timespans[j] + "</td>";
							}

							if (!isOneSecond) {
								var userId = this.findUser(g, r, d, roster, this.shiftTimeslots.rotas[r].timespans[j - 1], this.shiftTimeslots.rotas[r].timespans[j]);
								var userInfo = (userId) ? this.userInfo[userId] : "";

								if (userInfo) {
									tableRow += "<td " + (purposeOfReminder ? "class='h" + userId + "'>" : ">") + userInfo.name +"<br></br>"+ userInfo.phone + "</td>";
									isEmptyRow = false;
								} else
									tableRow += "<td></td>";
							}
						} // END DAY
						// Check if the Row has any information then don't hide it
						if (isEmptyRow || isOneSecond) {
							noRowsToHide++;
							if (header && !table) {
								table = "<tr>" + header + "</tr>";
								flushTableRow = false;
							}
						} else
							table += (header ? "<tr>" + header + "</tr>" : "") + "<tr>" + tableRow + "</tr>";
						makeHeader = false;
						header = "";
						if (flushTableRow)
							tableRow = "";
						else
							flushTableRow = true;
					} //END TIMESPAN
					tableRow = "";

					// Now that the loop through days and timespans is done we know the actual rowspans
					table = table.replace(rotaPlaceHolder, (this.shiftTimeslots.rotas[r].timespans.length - (noRowsToHide + 1)) * noOfRosterForRota);
					table = table.replace(rosterPlaceHolder, this.shiftTimeslots.rotas[r].timespans.length - (noRowsToHide + 1));

				} // END ROSTERS
			} // END ROTAS
			table += tableRow;
		}
		var html = "";
		if (!JSUtil.nil(table))
			html = "<table>" + table + "</table>";
		return html;
	},

	/*
	* Builds Schedule table for specific rota and adds users from that table to object users
	* @param GlideRecord rotaGR
	* @param String rosterID
	* @param GlideDateTime startTime
	* @param GlideDateTime endTime
	* @param Object users contains key-value pairs like 'userID' : 'GlideRecord("sys_user")'
	*/
	getUsers: function (rotaGR, rosterID, startTime, endTime, users) {
		this.log.debug("[getUsers] startTime: " + startTime);
		this.log.debug("[getUsers] endTime: " + endTime);
		var rotaID = rotaGR.getUniqueValue();
		var groupID = rotaGR.group;
		var userID;

		if (!JSUtil.isEmpty(this.schedule.groups)) {
			for (var day in this.schedule.groups[groupID].rotas[rotaID].days) {
				for (var period in this.schedule.groups[groupID].rotas[rotaID].days[day].timeslots) {
					userID = this.schedule.groups[groupID].rotas[rotaID].days[day].timeslots[period].rosters[rosterID];
					if (!users[userID] && JSUtil.notNil(userID)) {
						var userGR = new GlideRecord('sys_user');
						userGR.get(userID);
						users[userID] = userGR;
					}
				}
			}
		}
	},

	validGroupSysIds: function (dirtyGroupStr) {
        this.log.debug("[validGroupSysIds] dirtyGroupStr: " + dirtyGroupStr);
		if (JSUtil.nil(dirtyGroupStr))
			return "";
		var groups = dirtyGroupStr.match(/[0-9A-F]{32}/gi);
		if (groups && groups.length > 0)
			return groups.join(",");
		return "";
    },

	getGroupNames: function (groupSysIdsStr) {
        this.log.debug("[getGroupNames] groupSysIdsStr: " + groupSysIdsStr);
		if (JSUtil.nil(groupSysIdsStr))
			return "";
		var groupNames = [];
		var groupSysIds = groupSysIdsStr.split(",");
		if (!groupSysIds || groupSysIds.length < 1)
			return "";

		var gr = new GlideRecord("sys_user_group");
		for (var i = 0 ; i < groupSysIds.length; i++) {
			gr.initialize();
			gr.get(groupSysIds[i]);
			groupNames.push(gr.getValue("name"));
		}
		return groupNames.join(", ");
    },

	_dateComparator: function(a, b) {
		var systemDateTimeFormat = gs.getProperty("glide.sys.date_format") + " " + gs.getProperty("glide.sys.time_format");
		var userDateTimeFormat = gs.getUser().getDateFormat() + " " + gs.getUser().getTimeFormat();
		var dateTimeFormat = JSUtil.nil(userDateTimeFormat) ? (JSUtil.nil(systemDateTimeFormat) ? FormattedScheduleReport.UTC_DATE_FORMAT : systemDateTimeFormat) : userDateTimeFormat;
		var gdt1 = new GlideDateTime();
		gdt1.setValueUTC(a, dateTimeFormat);
		var gdt2 = new GlideDateTime();
		gdt2.setValueUTC(b, dateTimeFormat);
		return gdt1.getNumericValue() - gdt2.getNumericValue();
	},

	_timeComparator: function(a, b) {
		var systemTimeFormat = gs.getProperty("glide.sys.time_format");
		var userTimeFormat = gs.getUser().getTimeFormat();
		var timeFormat = JSUtil.nil(userTimeFormat) ? (JSUtil.nil(systemTimeFormat) ? FormattedScheduleReport.UTC_TIME_FORMAT : systemTimeFormat) : userTimeFormat;
		var gt1 = new GlideTime();
		gt1.setValueUTC(a, timeFormat);
		var gt2 = new GlideTime();
		gt2.setValueUTC(b, timeFormat);
		return gt1.getNumericValue() - gt2.getNumericValue();
	},

	/**
	 * Get the time string from a schedule date time object in the user's timezone and format
	 */
	_getTimeDisplayFromScheduleDateTime: function (scheduleDateTime) {
		return scheduleDateTime.getGlideDateTime().getDisplayValueInternal().split(" ")[1];
	},

	/**
	 * Get the time string from a schedule date time object in the user's timezone and format
	 */
	_getTimeValueFromScheduleDateTime: function (scheduleDateTime) {
		return scheduleDateTime.toString().split(" ")[1];
	},

	type: 'FormattedScheduleReport'
};
```