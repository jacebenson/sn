---
title: "OnCallGapsConflictsReportSNC"
id: "oncallgapsconflictsreportsnc"
---

API Name: global.OnCallGapsConflictsReportSNC

```js
var OnCallGapsConflictsReportSNC = Class.create();
OnCallGapsConflictsReportSNC.prototype = {
    initialize: function() {
        this.log = new GSLog("com.snc.on_call_rotation.log.level", this.type);
        this.ocsNG = new OnCallSecurityNG();
    },

    V_ON_CALL_REPORT_CACHE: 'v_on_call_report_cache',
    ATTR_REPORT_ID: 'report_id',
    ATTR_GROUP: 'group',
    ATTR_DATA: 'data',
    NO_OF_DAYS: 30,

    sendReports: function() {
        var userGr = new GlideRecord('sys_user');
        userGr.addActiveQuery();
        userGr.query();

        var userGroupReports = [];
        /* 
        SAMPLE: 
        this.userGroupReports = [{
        	userIds: [],
        	groupIds: []
        }]
        */


        var reportId = gs.generateGUID();
        var adminReport;

        while (userGr.next()) {
            var isRotaAdmin = this.ocsNG.rotaAdminAccess(userGr.sys_id + "");
            if (!isRotaAdmin || (isRotaAdmin && !adminReport)) {
                var userGroupReport = this._buildUserReportData(reportId, userGr.sys_id + "", isRotaAdmin);
                if (userGroupReport.groupIds.length) {
                    userGroupReports.push(userGroupReport);
                    if (isRotaAdmin) {
                        adminReport = userGroupReport;
                    }
                }
            } else {
                adminReport.userIds.push(userGr.sys_id + "");
            }
        }
        this._generateEmailsAndDispatch(reportId, userGroupReports);
        this._cacheDeleteReports(reportId);
    },

    _buildUserReportData: function(reportId, userSysId, isRotaAdmin) {
		var that = this;
        var onCallCommon = new OnCallCommon();
        var userGroupReport = {};
        userGroupReport.userIds = [userSysId];
        userGroupReport.groupIds = [];
        var groupId;

        // Directly managed groups
        var managerGroupGr = new GlideRecord("sys_user_group");
        onCallCommon.addManagedGroupsQuery(managerGroupGr, userSysId, isRotaAdmin);
        managerGroupGr.query();
        while (managerGroupGr.next()) {
            groupId = managerGroupGr.sys_id + "";
            this._buildGroupReportData(reportId, groupId);
            userGroupReport.groupIds.push(groupId);
        }

        if (!isRotaAdmin) {
            // Managed groups through delegation
            var gaHasRole = this.ocsNG.getDelegatedGroups(userSysId);
            while (gaHasRole.next()) {
                groupId = gaHasRole.getValue('granted_by');
                this._buildGroupReportData(reportId, groupId);
                userGroupReport.groupIds.push(groupId);
            }

            // Managed through group preferences
            var groupIds = this.ocsNG.getManagedGroupsByPreferences(userSysId);
            groupIds.forEach(function(groupId) {
                that._buildGroupReportData(reportId, groupId);
                userGroupReport.groupIds.push(groupId);
            });
        }

        return userGroupReport;
    },

    /*
     * @output: Group Report Id, temp record store in 
     */
    _buildGroupReportData: function(reportId, groupId) {
        if (!this._cacheHasReport(reportId, groupId)) {
            var groupReport = {};
            var todayGd = new GlideDate();
            var from = todayGd.getDisplayValueInternal();
            todayGd.addDays(30);
            var to = todayGd.getDisplayValueInternal();

            var gapsConflictsSpans = this._getGapsConflictsSpans(groupId, from, to, this.NO_OF_DAYS);
            if (gapsConflictsSpans) {
                this._populateGaps(groupReport, groupId, from, to, gapsConflictsSpans);
                this._populateConflicts(groupReport, groupId, from, to, gapsConflictsSpans);
            }
            this._populateRotaInfo(groupReport);
            this._cacheSaveReports(reportId, groupId, groupReport);
        }
    },

    _populateGaps: function(report, groupId, from, to, gapsConflictsSpans) {
        report.gaps = {};
        var gapTypes = ["user_inactive", "user_left", "user_timeoff_no_coverage"];
        var gapsObj = new OCOddityChecker().getGaps(from, to, groupId, this.NO_OF_DAYS, gapsConflictsSpans);
        gapTypes.forEach(function(gapType) {
            if (gapsObj[gapType] && gapsObj[gapType].length) {
                gapsObj[gapType].forEach(function(userId) {
                    gapsObj[userId].forEach(function(gap) {
                        if (!report.gaps[gap.rota_id]) {
                            rotaGap = {};
                            rotaGap.count = 0;
                            report.gaps[gap.rota_id] = rotaGap;
                        }
                        report.gaps[gap.rota_id].count++;
                    });
                });
            }
        });
    },

    _populateConflicts: function(report, groupId, from, to, gapsConflictsSpans) {
        report.conflicts = {};
        var conflicts = new OCOddityChecker().getConflictsInGroup(from, to, groupId, this.NO_OF_DAYS, gapsConflictsSpans);
        conflicts.forEach(function(conflict) {
            if (!report.conflicts[conflict.rota_id]) {
                rotaConflit = {};
                rotaConflit.count = 0;
                report.conflicts[conflict.rota_id] = rotaConflit;
            }
            report.conflicts[conflict.rota_id].count++;
        });
    },

    _populateRotaInfo: function(report) {
        var rotaGr = new GlideRecord("cmn_rota");
        Object.keys(report).forEach(function(key) {
            Object.keys(report[key]).forEach(function(rotaId) {
                if (rotaGr.get(rotaId)) {
                    report[key][rotaId].scheduleName = rotaGr.schedule.name + "";
                    report[key][rotaId].groupId = rotaGr.group + "";
                    report[key][rotaId].groupName = rotaGr.group.name + "";
                    report[key][rotaId].managerName = (rotaGr.group.manager + "") ? (rotaGr.group.manager.name + "") : "";
                }
            });
        });
    },

    _getGapsConflictsSpans: function(groupId, startDate, endDate, maxOddityDuration) {
        var oddityDateDiff = gs.dateDiff(startDate, endDate, true);
        if (JSUtil.nil(oddityDateDiff) || oddityDateDiff < 0) {
            this.log.logErr("[_getGapsConflictsSpans] : Invalid start and end time provided");
            return;
        }

        var providedOddityDuration = parseInt(oddityDateDiff / (24 * 60 * 60));
        if (providedOddityDuration > maxOddityDuration) {
            this.log.logErr("[_getGapsConflictsSpans] : Gaps and conflicts can not be found for more than {0} days", maxOddityDuration);
            return;
		}

        var formatterClass = OCFormatterMapping.formatters["dhtmlx"];
        var formatter = new formatterClass();
        var ocrRotaV2 = new OCRotationV2(null, formatter);

        return ocrRotaV2
            .setStartDate(startDate)
            .setEndDate(endDate)
            .setGroupIds(groupId)
            .getSpans();
	},

    _generateEmailsAndDispatch: function(reportId, userGroupReports) {
        var that = this;
        if (userGroupReports.length) {
            userGroupReports.forEach(function(userGroupReport) {
                if (userGroupReport.userIds.length) {
                    var htmlReport = that.generateEmailHtml(reportId, userGroupReport.groupIds);
                    if (htmlReport)
                        userGroupReport.userIds.forEach(function(userId) {
                            gs.eventQueue("rota.on_call.report", null, userId, htmlReport);
                        });
                }
            });
        }
    },

    /*
     * @output: returns html report. if there are no gaps and conflicts in consolidated report, then returns 'undefined'.
     */
    generateEmailHtml: function(reportId, groupIds) {
        var that = this;
        var consolidatedReport = {};
        groupIds.forEach(function(groupId) {
            var report = that._cacheGetReport(reportId, groupId);
            if (report)
                that._consolidateReport(consolidatedReport, report);
        });

        var html = this.getStyle();
        html += '<div><div id="schedule-report">';
        html += '<p>' + gs.getMessage('Please review pending actions for your On-Call group(s).') + '</p><table>';

        var gapKeys = Object.keys(consolidatedReport.gaps);
        var conflictKeys = Object.keys(consolidatedReport.conflicts);

        if(!gapKeys.length && !conflictKeys.length)
                return;

        if (gapKeys.length) {
            html += this.getHeader(gs.getMessage("On-Call Coverage Gaps"));
            gapKeys.forEach(function(key) {
                html += that.getRowHtml(consolidatedReport.gaps[key]);
            });
        }

        if (conflictKeys.length) {
            html += this.getHeader(gs.getMessage("On-Call Conflicts"));
            conflictKeys.forEach(function(key) {
                html += that.getRowHtml(consolidatedReport.conflicts[key]);
            });
        }

        html += '</table></div>';
        html += '</div>';

        return html;
    },

    getHeader: function(subHeading) {
        return "<tr> <th>" + subHeading +
            "</th> <th>" + gs.getMessage("Group Name") +
            "</th> <th>" + gs.getMessage("Manager Name") +
            "</th> <th>" + gs.getMessage("Schedule Name") +
            "</th> <th>" + gs.getMessage("Occurrences") +
            "</th> <th>" + gs.getMessage("Take Action") +
            "</th> </tr>";
    },

    getRowHtml: function(item) {
        var link = gs.getProperty('glide.servlet.uri') + "$oc_workbench.do?sysparm_group_id=" + item.groupId;
        return "<tr> <td></td> <td>" + item.groupName +
            "</td> <td>" + item.managerName +
            "</td> <td>" + item.scheduleName +
            "</td> <td>" + item.count +
            "</td> <td> <a href='" + link + "' target='_blank'>" + "View Workbench</a>" +
            "</td> </tr>";
    },

    getStyle: function() {
        return '<style> #schedule-report table, #schedule-report th, #schedule-report td { border-collapse: collapse; border: 1px solid black; text-align: center; padding: 5px; font-size: 10pt; font-family: SourceSansPro, "Helvetica Neue", Arial; } #schedule-report th, #schedule-report tr > td:first-child { background-color: #767676; color: white; } </style>';
    },

    _consolidateReport: function(consolidatedReport, report) {
        ["gaps", "conflicts"].forEach(function(key) {
            if (!consolidatedReport[key])
                consolidatedReport[key] = {};
            for (var attrName in report[key]) consolidatedReport[key][attrName] = report[key][attrName];
        });
    },

    _cacheHasReport: function(reportId, groupId) {
        var vocrGr = new GlideRecord(this.V_ON_CALL_REPORT_CACHE);
        vocrGr.addQuery(this.ATTR_REPORT_ID, reportId);
        vocrGr.addQuery(this.ATTR_GROUP, groupId);
        vocrGr.query();
        return vocrGr.hasNext();
    },

    _cacheGetReport: function(reportId, groupId) {
        var vocrGr = new GlideRecord(this.V_ON_CALL_REPORT_CACHE);
        vocrGr.addQuery(this.ATTR_REPORT_ID, reportId);
        vocrGr.addQuery(this.ATTR_GROUP, groupId);
        vocrGr.query();
        if (vocrGr.next()) {
            var reportData = vocrGr.getValue(this.ATTR_DATA);
            if (reportData) {
                return JSON.parse(reportData);
            }
        }
    },

    _cacheSaveReports: function(reportId, groupId, reportData) {
        var vocrGr = new GlideRecord(this.V_ON_CALL_REPORT_CACHE);
        vocrGr.initialize();
        vocrGr.setValue(this.ATTR_REPORT_ID, reportId);
        vocrGr.setValue(this.ATTR_GROUP, groupId);
        vocrGr.setValue(this.ATTR_DATA, JSON.stringify(reportData));
        vocrGr.insert();
    },

    _cacheDeleteReports: function(reportId) {
        var vocrGr = new GlideRecord(this.V_ON_CALL_REPORT_CACHE);
        vocrGr.addQuery(this.ATTR_REPORT_ID, reportId);
        vocrGr.deleteMultiple();
    },

    type: 'OnCallGapsConflictsReportSNC'
};

```