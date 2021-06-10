---
title: "ISCNotificationTemplateUtility"
id: "iscnotificationtemplateutility"
---

API Name: global.ISCNotificationTemplateUtility

```js
var ISCNotificationTemplateUtility = Class.create();
ISCNotificationTemplateUtility.prototype = {
    initialize: function() {
    },
    /**
     * This function will be used to gather and return the weekly digest information.
     */
    weeklyDigest: function() {
        // Collect information for weekly digest
        var current = gs.nowDateTime();
        var lastWeekDateTime = gs.daysAgo(7);

        // Collect info from security dashboard events
        var failedLogins = _getDashboardEvent(lastWeekDateTime, 'login_failed');
        var externalLogins = _getDashboardEvent(lastWeekDateTime, 'login_external');
        var securityElevations = _getDashboardEvent(lastWeekDateTime, 'security_elevation');
        var sncLogins = _getDashboardEvent(lastWeekDateTime, 'login_snc');
        var adminLogins = _getDashboardEvent(lastWeekDateTime, 'login_admin');

        // Everything else
        var complianceScore = _getComplianceScore();
        var quarantinedFiles = _getQuarantinedFiles(lastWeekDateTime);
        var virusTypes = _getVirusTypes(lastWeekDateTime);
        var adminUsersAdded = _getAdminUsersAdded(lastWeekDateTime);
        var impersonations = _getDashboardEvent(lastWeekDateTime, 'impersonation');
        var spamEmails = _getSpamEmails(lastWeekDateTime);

        return {
            failedLogins: failedLogins.toString(),
            externalLogins: externalLogins.toString(),
            securityElevations: securityElevations.toString(),
            sncLogins: sncLogins.toString(),
            adminLogins: adminLogins.toString(),
            complianceScore: complianceScore.toString(),
            quarantinedFiles: quarantinedFiles.toString(),
            virusTypes: virusTypes.toString(),
            adminUsersAdded: adminUsersAdded.toString(),
            impersonations: impersonations.toString(),
            spamEmails: spamEmails.toString(),
        };

        function _getDashboardEvent(past, event) {
            var secDashGa = new GlideAggregate('appsec_security_dashboard_event_logs');
            secDashGa.addQuery('sec_dash_event', event);
            secDashGa.addQuery('sys_created_on', '>=', past);
            secDashGa.addAggregate('COUNT');
            secDashGa.query();
    
            if (secDashGa.next()) {
                return secDashGa.getAggregate('COUNT');
            } else {
                return 0;
            }
        }
    
        // Get compliance score
        // Calculation: .75 * (# of High Configured / # of High Available) +
        //  .15 (# of Mid Configured / # of Mid Available) + .1 (# of Low Configured / # of Low Available)
        function _getComplianceScore() {
            var REQUIREMENT = {
                HIGH: 1,
                MEDIUM: 2,
                LOW: 3
            };
            var APPSEC_HARDENING_CONFIGURATIONS = 'appsec_hardening_configurations';
    
            var numHighConfig = _getNumConfig(REQUIREMENT.HIGH);
            var numHigh = _getNum(REQUIREMENT.HIGH);
            var numMedConfig = _getNumConfig(REQUIREMENT.MEDIUM);
            var numMed = _getNum(REQUIREMENT.MEDIUM);
            var numLowConfig = _getNumConfig(REQUIREMENT.LOW);
            var numLow = _getNum(REQUIREMENT.LOW);
    
            return _calculateComplianceScore(numHighConfig, numHigh, numMedConfig, numMed, numLowConfig, numLow);
    
            function _getNumConfig(requirement) {
                var ga = new GlideAggregate(APPSEC_HARDENING_CONFIGURATIONS);
                ga.addQuery('harc_compliance_state', 'Pass');
                ga.addQuery('harc_requirement', requirement);
                ga.addAggregate('COUNT');
                ga.query();
        
                if (ga.next()) {
                    return ga.getAggregate('COUNT');
                } else {
                    return 0;
                }
            }
    
            function _getNum(requirement) {
                ga = new GlideAggregate(APPSEC_HARDENING_CONFIGURATIONS);
                ga.addQuery('harc_requirement', requirement);
                ga.addAggregate('COUNT');
                ga.query();
        
                if (ga.next()) {
                    return ga.getAggregate('COUNT');
                } else {
                    return 0;
                }
            }
    
            function _calculateComplianceScore(numHighConfig, numHigh, numMedConfig, numMed, numLowConfig, numLow) {
                // If there are no compliance items under the requirement then this formula will break
                if (numHigh === 0 || numMed === 0 || numLow === 0) {
                    return -1;
                } else {
                    return Math.floor(100 * (.005 + .75 * (numHighConfig / numHigh) + 
                        .15 * (numMedConfig / numMed) +
                        .1 * (numLowConfig / numLow)));
                }
            }
        }
        
        // Get quarantined files since past
        function _getQuarantinedFiles(past) {
            var quarantinedFilesGa = new GlideAggregate('quarantined_file');
            quarantinedFilesGa.addQuery('sys_created_on', '>=', past);
            quarantinedFilesGa.addAggregate('COUNT');
            quarantinedFilesGa.query();
            if (quarantinedFilesGa.next()) {
                return quarantinedFilesGa.getAggregate('COUNT');
            } else {
                return 0;
            }
        }
    
        // Get all viruses detected since past
        function _getVirusTypes(past) {
            var quarantinedFilesGa = new GlideAggregate('quarantined_file');
            quarantinedFilesGa.addQuery('sys_created_on', '>=', past);
            quarantinedFilesGa.addAggregate('COUNT(DISTINCT', 'ash_virus');
            quarantinedFilesGa.query();
            if (quarantinedFilesGa.next()) {
                return quarantinedFilesGa.getAggregate('COUNT(DISTINCT', 'ash_virus');
            } else {
                return 0;
            }
        }
    
        // Get admin users since past
        function _getAdminUsersAdded(past) {
            var sysUserHasRoleGa = new GlideAggregate('sys_user_has_role');
            sysUserHasRoleGa.addQuery('role', '2831a114c611228501d4ea6c309d626d');
            sysUserHasRoleGa.addQuery('sys_created_on', '>=', past);
            sysUserHasRoleGa.addAggregate('COUNT');
            sysUserHasRoleGa.query();
    
            if (sysUserHasRoleGa.next()) {
                return sysUserHasRoleGa.getAggregate('COUNT');
            } else {
                return 0;
            }
        }
    
        // Get spam emails since past
        function _getSpamEmails(past) {
            var sysEmailGa = new GlideAggregate('sys_email');
            sysEmailGa.addQuery('mailbox.name', 'Junk');
            sysEmailGa.addQuery('sys_created_on', '>=', past);
            sysEmailGa.addAggregate('COUNT');
            sysEmailGa.query();
    
            if (sysEmailGa.next()) {
                return sysEmailGa.getAggregate('COUNT');
            } else {
                return 0;
            }
        }
    },
    /**
     * This function will return the styling for the ISC notification emails
     */
    getStyling: function() {
        // Take bootstrap CSS to match rest of instanceÍ
        var styles = "<style>" +
                "* { box-sizing: border-box }" +
                "table { border-collapse: collapse; padding: 0; }" +
                "th { text-align: inherit; }" +
                ".table { width: 100%; max-width: 100%; margin-bottom: 1rem; background-color: transparent; font-size: 14px; color: #293e40; }" +
                ".table thead th { vertical-align: bottom; border-bottom: 2px solid #dee2e6 }" +
                ".table td { padding: .75rem; vertical-align: top; border-top: 1px solid #dee2e6; padding: 0px; }" +
                ".email-content .title { font-weight: 600; }" +
                ".email-content .body { font-size: 14px }" +
                "a { text-decoration: none; color: #1f8476; } " +
                "h4 { margin-top: 10px; margin-bottom: 10px; }" +
                "p { margin: 0 0 10px; font-size: 14px; } " +
                ".progress { overflow: hidden; height: 20px; margin-bottom: 20px; border-radius: 4px; " + 
                "-webkit-box-shadow: inset 0 1px 2px rgba (0, 0, 0, .1); box-shadow: inset 0 1px 2px rgba(0, 0, 0, .1); }" +
                ".progress-bar { float: left; width: 0%; height: 100%; font-size: 12px; line-height: 20px; color: #000; text-align: center; " +
                    "background-color: #1f8476; -webkit-box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .15); box-shadow: inset 0 -1px 0 rgba(0, 0, 0, .15); " +
                    "-webkit-transition: width: .6 ease; -0-transition: width .6 ease; transition: width .6s ease; }" +
                ".progress-bar-success { background-color: #4CA965; }" +
                ".progress-bar-warning { background-color: #F9C642; }" +
                ".progress-bar-danger { background-color: #E83C36; }" +
                ".flex-column { display: -ms-flexbox; display: -moz-flex; display: -webkit-box; display: -webkit-flex; display: flex; " +
                "-ms-flex-flow: column nowrap; -moz-flex-flow: column nowrap; -webkit-flex-flow: column nowrap; flex-flow: column nowrap }" +
                ".flex-row { display: -ms-flexbox; display: -moz-flex; display: -webkit-box; display: -webkit-flex; display: flex; " +
                    "-ms-flex-flow: row nowrap; -moz-flex-flow: row nowrap; -webkit-flex-flow: row nowrap; flex-flow: row nowrap }" +
                ".card { height: 90px; background-color: #F1F1F1; margin: 10px; }" +
                ".card .card-image { width: 90px; height: 90px; background-color: #293e40; text-align: center; align-items: center; justify-content: center; } " +
                ".card .card-image .number { align-items: center; justify-content: center; color: white; font-size: 30px; } " +
                ".card .card-content { margin-left: 1rem; padding: 10px; font-size: 14px; }" +
                ".card .card-content h5 { font-weight: 600; } " +
                ".card .card-content h5, p { margin: 0; line-height: 24px; font-size: 14px; } " +
                ".card .link { font-size: 12px; } " +
            "</style>";

        return styles;
    },
    /**
     * This function will check if the sys_id is for a valid user
     * @param {string} userSysId - sys_id of sys_user
     */
    verifyEmail: function(userSysId) {
        var userGr = new GlideRecord('sys_user');
        return userGr.get(userSysId);
    },
    /**
     * This function will create the appropriate link for the specific event
     * @param {string} type - The type of security event
     * @param {object} data - The data object that will contain each event's specific information
     */
    getLink: function(type, data) {
        var link = gs.getProperty('glide.servlet.uri');
        var lastWeekDateTime = gs.daysAgo(7);
        var secDashEvents = {
            failedLogins: 'login_failed',
            externalLogins: 'login_external',
            securityElevations: 'security_elevation',
            sncLogins: 'login_snc',
            adminLogins: 'login_admin',
            impersonations: 'impersonation',
        };

        // Return link based on event/report combination
        if (type === this.eventNames.LOGIN_FAILED) {
            var userName = data.userName,
                time = data.time;
            link += 'isc?id=security_report_details&table=sysevent&filter=name=login.failed^parm1=' +
                userName + '^sys_created_on<=' + time + '^ORDERBYDESCsys_created_on';
        } else if(type === this.eventNames.IMPERSONATION) {
            var userName = data.userName,
                time = data.time;
            link += 'isc?id=security_report_details&table=sysevent&filter=name=impersonation.start^parm2=' +
                userName + '^sys_created_on<=' + time + '^ORDERBYDESCsys_created_on';
        } else if(type === this.eventNames.NEW_ADMIN_LOGIN) {
            var userName = data.userName,
                time = data.time;
            link += "isc?id=security_report_details&table=sysevent&filter=name=login^parm1=" + userName +
                '^sys_created_on<=' + time + "^ORDERBYDESCsys_created_on";
        } else if(type === this.eventNames.SECURITY_ELEVATION) {
            var userName = data.userName,
                time = data.time;
            link += 'isc?id=security_report_details&table=sysevent&filter=name=security.elevated_role.enabled^parm1='
                + userName + '^sys_created_on<=' + time + '^ORDERBYDESCsys_created_on';
        } else if(type === this.eventNames.HP_ROLE_ADDED) {
            var userSysId = data.userSysId,
            time = data.time;
            link += 'isc?id=security_report_details&table=sys_user_has_role&filter=user=' +
                userSysId + '^sys_created_on<=' + time + '^ORDERBYDESCsys_created_on';
        } else if(type === this.eventNames.WEEKLY_DIGEST) {
            var id = data.id,
                time = data.time;
            switch(id) {
                case 'failedLogins':
                case 'externalLogins':
                case 'securityElevations':
                case 'sncLogins':
                case 'adminLogins':
                case 'impersonations':
                    link += 'isc?id=security_report_details&table=appsec_security_dashboard_event_logs&filter=sec_dash_event='
                        + secDashEvents[id] + '^sys_created_on>' + lastWeekDateTime + '^sys_created_on<= +' + time + '^ORDERBYDESCsys_created_on';
                    break;
                case 'quarantinedFiles':
                case 'virusTypes':
                    link += 'isc?id=security_report_details&table=quarantined_file&filter=sys_created_on>'
                        + lastWeekDateTime + '^sys_created_on<= +' + time + '^ORDERBYDESCsys_created_on';
                    break;
                case 'adminUsersAdded':
                    link += 'isc?id=security_report_details&table=sys_user_has_role&filter=role.name=admin^sys_created_on>'
                        + lastWeekDateTime + '^sys_created_on<= +' + time + '^ORDERBYDESCsys_created_on';
                    break;
                case 'spamEmails':
                    link += 'isc?id=security_report_details&table=sys_email&filter=mailbox.name=Junk^sys_created_on>'
                        + lastWeekDateTime + '^sys_created_on<= +' + time + '^ORDERBYDESCsys_created_on';
                    break;
                default:
                    break;
            }
        }


        return link;
    },
    /**
     * This function will convert the time passed to it to the lexical month/day time
     * @param {GlideDateTime} gdt - The GlideDateTime object to be converted to lexical time
     */
    convertToLexicalTime: function(gdt) {
        var monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var month = monthNames[gdt.getMonthLocalTime() - 1];
        var day = gdt.getDayOfMonthLocalTime();

        return month + ' ' + day;
    },
    type: 'ISCNotificationTemplateUtility'
};

ISCNotificationTemplateUtility.prototype.weeklyDigestTitles = {
    failedLogins: 'Failed Logins',
    externalLogins: 'External Logins',
    securityElevations: 'Security Elevations',
    sncLogins: 'SNC Logins',
    adminLogins: 'Admin Logins',
    quarantinedFiles: 'Quarantined Files',
    virusTypes: 'Virus Types',
    adminUsersAdded: 'Admin Users Added',
    impersonations: 'Impersonations',
    spamEmails: 'Spam Emails',
};

ISCNotificationTemplateUtility.prototype.weeklyDigestDesc = {
    failedLogins: 'Number of attempted logins that failed',
    externalLogins: 'Number of successful user logins with snc_external role',
    securityElevations: 'Number of times that an admin has elevated to security_admin role',
    sncLogins: 'Number of ServiceNow logins',
    adminLogins: 'Number of successful user logins with admin role',
    quarantinedFiles: 'Number of files that were quarantined from running Antivirus Scan',
    virusTypes: 'Number of different virus types found during antivirus scan',
    adminUsersAdded: 'Number of users with an admin role that were added',
    impersonations: 'Number of impersonation login',
    spamEmails: 'Number of incoming emails to the instance marked as spam',
};

ISCNotificationTemplateUtility.prototype.eventNames = {
    LOGIN_FAILED: 'appsec.notification.login.failed',
    IMPERSONATION: 'appsec.notification.impersonation',
    NEW_ADMIN_LOGIN: 'appsec.notification.login.new_ip',
    SECURITY_ELEVATION: 'appsec.notification.security.elevation',
    WEEKLY_DIGEST: 'appsec.notification.weekly_digest',
    HP_ROLE_ADDED: 'appsec.notification.hp_role_added',
};
```