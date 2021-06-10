---
title: "OnCallReminderEmailGenerator"
id: "oncallreminderemailgenerator"
---

API Name: global.OnCallReminderEmailGenerator

```js
var OnCallReminderEmailGenerator = Class.create();
OnCallReminderEmailGenerator.prototype = {
    initialize: function() {
    },
	util: {
		getName: function (id, table) {
			var record = new GlideRecord(table);
			if(record.get(id))
				return record.name;
			return null;
		},
		getNumber: function (id) {
			var record = new GlideRecord('sys_user');
			if(record.get(id))
				return record.mobile_phone;
			return null;
		},
		dayOfWeekAsInteger: function(day) {
			//servicenow getDay works from 1 - 7
			var days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
			return days[day-1];
		},
		monthOfYearAsInteger: function(month) {
			var months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
			return months[month-1];
		},
		getHourAndMinute: function(time) {
			//get the time, in a foul way there is no getHours() on GlideDateTime and strip away seconds
			return  (time.getDisplayValue()).split(' ')[1].slice(0, -3);
		},
		getRotaName: function(rotaId){
			var rota = new GlideRecord("cmn_rota");
			rota.get(rotaId);
			return rota.name;
		}
	},

	buildHeader: function(roster) {
		//Group name and roster column
		var html = '<tr>';
		html += '<th colspan="2" class="box align-middle"><h3>Group<br>On-Call Schedule</h3></th>';

		//Dates columns
		for(var day = 0; day < roster.dates.length; day++) {
			html += '<th class="cell"><b>' + roster.dates[day].day + '</b>';
			html += '<br>' + new GlideDateTime(roster.dates[day].date).getDayOfMonth() + ' ' + this.util.monthOfYearAsInteger(new GlideDateTime(roster.dates[day].date).getMonth());
			html += '</th>';
		}
		html += '</tr>';
		return html;
	},
	buildBody: function(dates, group) {
		//first column is name of roster
		//rowspan will be sum of shifts * their spans
		var html = '<tr>';
		var lineupSize = dates[0].members.length + 1;
		html += '<td rowspan="'+ lineupSize +'" class="box align-middle thick-border-top">' + 
			this.util.getName(group, 'sys_user_group') + "<br>" +
			dates[0].members[0].rotaName + '</td>';
		var i18nTo = gs.getMessage(' to ');
		for(var row in dates[0].members) {
			//for each day, show escalation plan
			html += '<tr>';
			var shiftStart = 
				this.util.getHourAndMinute(new GlideDateTime(dates[row].shift.from.getDisplayValue()));
			var shiftEnd = 
				this.util.getHourAndMinute(new GlideDateTime(dates[row].shift.to.getDisplayValue()));
			
			//only add a thick border to the first row
			if(row == 0)
				html += '<td class="cell thick-border-top">' + shiftStart + i18nTo + shiftEnd + '</td>';
			else
				html += '<td class="cell">' + shiftStart + i18nTo + shiftEnd + '</td>';

			for(var date in dates) {
				//show member lineup
				html += '<td class="cell';
				if(dates[date].members[row].highlight)
					html += ' highlight';
				if (row == 0)
					html += ' thick-border-top';
				if (row == dates[date].members.length)
					html += ' thick-border-bottom';
				
				html += '">';
				
				html += dates[date].members[row].name;
				html += '<br>' + dates[date].members[row].roster;
				html += '<br>' + dates[date].members[row].number;
				html += '</td>';
			}
			html += '</tr>';
		}
		return html;
	},
	buildFooter: function(link) {
		var i18nMsg = gs.getMessage('See your schedule');
		return "<tr><td><a href='" + link + "'>" + i18nMsg + "</a></td></tr>";
	},
	buildRoster: function(roster, dates, group, link) {
		var html = "<table cellspacing='0'>";
		html += this.buildHeader(roster);
		html += this.buildBody(dates, group);
		html += this.buildFooter(link);
		html += "</table>";
		return html;
	},
	buildMail: function(user, group, plans, link) {
		
		//this is needed for scoping
		var me = this;
		//only relevant in this function
		//and very coupled, so keep in here
		function getDates() {
			var dates = [];
			for(var key in plans) {
				var plan = plans[key].plan;
				var date = plans[key].date;
				var shift = plans[key].shift;
				var rota = plans[key].rota;
				
				var members = [];
				for(var i = 0; i < plan.size(); i++) {
					var highlight = false;
					var member = plan.get(i).userId;

					if(user == member)
						highlight = true;
					
					member = { 
						name : me.util.getName(member, 'sys_user'),
						roster : me.util.getName(plan.get(i).rosterId, 'cmn_rota_roster'),
						number : me.util.getNumber(member),
						highlight : highlight,
						rotaName : me.util.getRotaName(rota)
					};
					members.push(member);
				}
				
				var dateObj = {
					date : date,
					day : me.util.dayOfWeekAsInteger(new GlideDateTime(date).getDayOfWeek()),
					shift : shift,
					members : members
				};
				dates.push(dateObj);
			}
			return dates;
		}
		
		var roster = {
			name : "roster",
			dates : getDates(),
			timezone : "CET"
		};
		
		var html = '';
		html += this.buildRoster(roster, roster.dates, group, link);
		
		return html + this.buildStyle();
	},
	
	buildStyle : function() {
		return "<style type='text/css'>.box {border: 1px solid black;border-top: 1px solid black;padding: 10px;}.cell {border: 1px solid black;text-align: center;padding: 10px}.align-middle{text-align: center;vertical-align: middle;}.primary {color: red;}.thick-border-top {border-top: 4px solid black;}thick-border-bottom{border-bottom: 4px solid black;}.highlight{background-color: #BAF2AE;}</style>";
	},

    type: 'OnCallReminderEmailGenerator'
};
```