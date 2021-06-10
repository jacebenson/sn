---
title: "ISCEventsUtil"
id: "isceventsutil"
---

API Name: global.ISCEventsUtil

```js
var ISCEventsUtil = Class.create();
ISCEventsUtil.prototype = {
    initialize: function () {},
    /**
     * This function will be called by script action AppSec Event - Logins to handle
     * ISC related login events.
     */
    loginEvent: function () {

        var that = this;
        var userGr = new GlideRecord('sys_user');
        var userName = event.parm1;
        var currentIpAddress = event.parm2;
        var eventCreatedOn = event.sys_created_on;

        // Get current user
        userGr.addQuery('user_name', userName);
        userGr.query();

        // Log dashboard event and check for security notifications
        if (userGr.next()) {
            _checkAdminEvent(userGr, currentIpAddress, userName, eventCreatedOn);
            _checkExternalLoginEvent(userGr, currentIpAddress, userName, eventCreatedOn);
            _notifyNewAdminLogin(userGr, userName, currentIpAddress);
        }
        _checkSncLoginEvent(currentIpAddress, userName, eventCreatedOn);

        function _generateEventForLogin(eventName, parm1, parm2, createdOn) {
            var recordId = "";
            var gr = new GlideRecord('sysevent');
            gr.addQuery('name', "CONTAINS", eventName);
            gr.addQuery('parm1', parm1);
            gr.addQuery('parm2', parm2);
            gr.addQuery('sys_created_on', createdOn);
            gr.query();
            if (gr.next()) {
                recordId = gr.sys_id.toString();
            }

            return recordId;
        }

        /**
         * This function will log an admin login event to the security dashboard events table
         * if the user logged in has the role admin.
         * @param {GlideRecord} gr - glide record of logged in user
         * @param {string} ipAddress - ip address of logged in user
         * @param {string} userId - sys_id of logged in user
         * @param {string} createdOn - the date the event was created on
         */
        function _checkAdminEvent(gr, ipAddress, userName, createdOn) {
            var recordObjId = _generateEventForLogin("login", userName, ipAddress, createdOn);
            if (that._checkRole(gr, '2831a114c611228501d4ea6c309d626d')) {
                that._insertSecDashEventRecord({
                    event: 'login_admin',
                    user_description: "Admin Login : " + userName,
                    createdOn: createdOn,
                    ipAddress: ipAddress,
                    reference: recordObjId
                });
            }
        }

        /**
         * This function will log an external login event to the security dashboard events table
         * if the user logged in has the role "snc_external".
         * @param {GlideRecord} gr - glide record of logged in user
         * @param {string} ipAddress - ip address of logged in user
         * @param {string} userId - sys_id of logged in user
         * @param {string} createdOn - the date the event was created on
         */
        function _checkExternalLoginEvent(gr, ipAddress, userName, createdOn) {
            var recordObjId = _generateEventForLogin("login", userName, ipAddress, createdOn);
            if (that._checkRole(gr, '940ba702933002009c8579b4f47ffbe2')) {
                that._insertSecDashEventRecord({
                    event: 'login_external',
                    user_description: "External Login : " + userName,
                    createdOn: createdOn,
                    ipAddress: ipAddress,
                    reference: recordObjId
                });
            }
        }

        /**
         * This function will log a snc login event to the security dashboard events table
         * if the user logged in has snc prefixed to their name.
         * @param {string} name - username of logged in user
         * @param {string} ipAddress - ip address of logged in user
         * @param {string} userId - sys_id of logged in user
         * @param {string} createdOn - the date the event was created on
         */
        function _checkSncLoginEvent(ipAddress, userName, createdOn) {
            var recordObjId = _generateEventForLogin("login", userName, ipAddress, createdOn);
            if (userName.contains("@snc")) {
                that._insertSecDashEventRecord({
                    event: 'login_snc',
                    user_description: "SNC Login : " + userName,
                    createdOn: createdOn,
                    ipAddress: ipAddress,
                    reference: recordObjId
                });
            }
        }

        /**
         * This function will send an email notification to the logged in user if they have
         * a high privilege role and the login event is occuring a new ip address.
         * @param {GlideRecord} gr - glide record of logged in user
         * @param {string} name - username of logged in user
         * @param {string} ipAddress - ip address of logged in user
         */
        function _notifyNewAdminLogin(gr, name, ipAddress) {
            var foundNewLogin = false;
            var loginEvent = 'login';

            // Verify notificaiton enabled
            if(that._canReceiveNotification(gr)) {
                // Check to see if this is the first occurence of this ip address
                var firstLocation = false;
                var sysEventGa = new GlideAggregate('sysevent');
                sysEventGa.addQuery('name', loginEvent);
                sysEventGa.addQuery('parm1', name);
                sysEventGa.addQuery('parm2', ipAddress);
                sysEventGa.addAggregate('COUNT');
                sysEventGa.query();
                if (sysEventGa.next()) {
                    firstLocation = sysEventGa.getAggregate('COUNT') === '1';
                }

                // If this is the first location, next check for distinct ip addresses.
                // Only log a new event if there is more than one distinct ip address
                if (firstLocation) {
                    sysEventGa = new GlideAggregate('sysevent');
                    sysEventGa.addQuery('name', loginEvent);
                    sysEventGa.addQuery('parm1', name);
                    sysEventGa.addAggregate('COUNT(DISTINCT', 'parm2');
                    sysEventGa.setGroup(false);
                    sysEventGa.query();

                    if (sysEventGa.next()) {
                        foundNewLogin = parseInt(sysEventGa.getAggregate('COUNT(DISTINCT', 'parm2'), 10) > 1;
                    }
                }
            }

            // If there's a new login, log the event
            if (foundNewLogin) {
                // Add security notification to platform
                var notificationListGr = that.addToNotifications(that.eventNames.NEW_ADMIN_LOGIN, gr.sys_id, ipAddress);

                // Send email if user has it enabled
                if (that._checkNotificationEnabled(that.notificationNames.NEW_ADMIN_LOGIN, gr)) {
                    gs.eventQueue(that.eventNames.NEW_ADMIN_LOGIN, notificationListGr, gr.sys_id, ipAddress);
                }
            }
        }
    },
    /**
     * This function will be called by the script action AppSec Event - Failed Login
     * to handle ISC related failed login events. This will be used to record the
     * security dashboard events.
     */
    loginFailed: function () {
        var that = this;
        var userGr = new GlideRecord('sys_user');
        var user_name = event.parm1;
        var ip_address = event.parm2;
        var eventCreatedOn = event.sys_created_on;
        userGr.addQuery('user_name', user_name);
        userGr.query();

        // Log dashboard event and check for security notifications
        if (userGr.next()) {
            var recordObjId = _generateEventForFailedLogin("login", user_name, ip_address, eventCreatedOn);
            that._insertSecDashEventRecord({
                event: 'login_failed',
                user_description: "Failed Login: " + user_name,
                createdOn: eventCreatedOn,
                ipAddress: ip_address,
                reference: recordObjId
            });
        }

        //Generate Event For Failed Login
        function _generateEventForFailedLogin(eventName, parm1, parm2, createdOn) {
            var recordId = "";
            var gr = new GlideRecord('sysevent');
            gr.addQuery('name', "CONTAINS", eventName);
            gr.addQuery('parm1', parm1);
            gr.addQuery('parm2', parm2);
            gr.addQuery('sys_created_on', createdOn);
            gr.query();
            if (gr.next()) {
                recordId = gr.sys_id.toString();
            }

            return recordId;
        }
    },
    /**
     * This function will be executed by a BR when the user gets locked out from
     * failing logins too many times. It will send a notification in the platform
     * that there have been failed login attempts made to notified user's account.
     * @param {GlideRecord} userGr - The sys_user GlideRecord
     */
    loginFailedNotification: function(userGr) {
        // Send notification based on lockout
        var maxUnlockAttempts = gs.getProperty("glide.user.max_unlock_attempts", 5);
        if (userGr.failed_attempts > maxUnlockAttempts && this._canReceiveNotification(userGr) &&
            _checkConsecutiveEmails(userGr) < 3) {

            // Add security notification to platform
            var notificationListGr = this.addToNotifications(this.eventNames.LOGIN_FAILED, userGr.sys_id, userGr.failed_attempts);

            // Send notification if we haven't sent 3 in a row already
            if (this._checkNotificationEnabled(this.notificationNames.LOGIN_FAILED, userGr)) {
                gs.eventQueue(this.eventNames.LOGIN_FAILED, notificationListGr, userGr.sys_id, userGr.failed_attempts);
            }
        }

        /**
         * This function will check the number of emails we have sent since the last lockout
         */
        function _checkConsecutiveEmails(gr) {
            // Only send up to 3 emails if there have been 3 consecutive lockouts
            // There are 5 login failed attempts before a lockout, so 3 consecutive notifications
            // would have occured after 15 consecutive failed logins.
            var consecutiveFailed = 0;
            var eventHistoryGr = new GlideRecord('sysevent');
            var q1 = eventHistoryGr.addQuery('name', 'login');
            q1.addOrCondition('name', 'login.failed');
            eventHistoryGr.addQuery('parm1', gr.user_name);
            eventHistoryGr.orderByDesc('sys_created_on');
            eventHistoryGr.query();

            while (eventHistoryGr.next() && consecutiveFailed < 18) {
                if (eventHistoryGr.name.toString() === 'login.failed') {
                    consecutiveFailed += 1;
                } else {
                    break;
                }
            }

            return Math.floor(consecutiveFailed / 6);
        }
    },
    /**
     * This function will be called by the script action AppSec Event - Security Elevations
     * to handle ISC related security elevation events
     */
    securityElevation: function () {
        var that = this;
        var elevatedUser = event.parm1;
        var elevatedTo = event.parm2;
        var eventCreatedOn = event.sys_created_on;

        var recordObjId = _generateEventForElevation("security.elevated_role", elevatedUser, elevatedTo, eventCreatedOn);
        // Log the security dashboard event and notify enabled users
        this._insertSecDashEventRecord({
            event: 'security_elevation',
            user_description: elevatedUser + " elevated " + elevatedTo,
            createdOn: eventCreatedOn,
            reference: recordObjId
        });
        _notifySubscribedUsers(elevatedUser);

        // Generate Event For Elevation
        function _generateEventForElevation(eventName, parm1, parm2, createdOn) {
            var recordId = "";
            var gr = new GlideRecord('sysevent');
            gr.addQuery('name', "CONTAINS", eventName);
            gr.addQuery('parm1', parm1);
            gr.addQuery('parm2', parm2);
            gr.addQuery('sys_created_on', createdOn);
            gr.query();
            if (gr.next()) {
                recordId = gr.sys_id.toString();
            }

            return recordId;
        }

        /**
         * This function will send an email notification to all high privilege users
         * when a user has their roles elevated to a high privilege role
         * @param {string} user - username of the elevated user
         */
        function _notifySubscribedUsers(user) {
            // Get all admin/security admin users
            var allAdminGr = new GlideAggregate(that.tables.USER_HAS_ROLE);
            var allAdminQc = allAdminGr.addQuery('role', that.hpRoles[0]);
            allAdminQc.addOrCondition('role', that.hpRoles[1]);
            allAdminGr.groupBy('user');
            allAdminGr.query();
            while (allAdminGr.next()) {
                // Add security notification to platform
                var notificationListGr = that.addToNotifications(that.eventNames.SECURITY_ELEVATION, allAdminGr.user.sys_id, user);

                // Send email if user has it enabled
                if (that._checkNotificationEnabled(that.notificationNames.SECURITY_ELEVATION, allAdminGr.user)) {
                    gs.eventQueue(that.eventNames.SECURITY_ELEVATION, notificationListGr, allAdminGr.user.sys_id, user);
                }
            }
        }
    },
    /**
     * This function will be called by the script action AppSec Event - Impersonation Start
     * to handle ISC related impersonation events
     */
    impersonation: function () {
        var that = this;
        var eventCreatedOn = event.sys_created_on;
        var userImpersonating = event.parm1.toString();
        var userImpersonated = event.parm2.toString();

        // Log the security dashboard event and notify impersonated user if HP
        var recordObjId = _generateEventForImpersonation("impersonation", userImpersonating, userImpersonated, eventCreatedOn);
        this._insertSecDashEventRecord({
            event: 'impersonation',
            user_description: userImpersonating + " impersonated " + userImpersonated,
            createdOn: eventCreatedOn,
            reference: recordObjId
        });

        // Notify the impersonated user on platform
        _notifyImpersonatedUser(userImpersonated, userImpersonating);

        // Generate Event For Impersonation
        function _generateEventForImpersonation(eventName, parm1, parm2, createdOn) {
            var recordId = "";
            var gr = new GlideRecord('sysevent');
            gr.addQuery('name', "CONTAINS", eventName);
            gr.addQuery('parm1', parm1);
            gr.addQuery('parm2', parm2);
            gr.addQuery('sys_created_on', createdOn);
            gr.query();
            if (gr.next()) {
                recordId = gr.sys_id.toString();
            }

            return recordId;
        }

        /**
         * This function will sned an email notification a high privlege user
         * if they are being impersonated
         * @param {string} user - the username of the impersonated user
         * @param {string} userImpersonating - the username of the impersonating user
         */
        function _notifyImpersonatedUser(user, userImpersonating) {
            var userGr = new GlideRecord('sys_user');
            userGr.addQuery('user_name', user);
            userGr.query();

            // Check impersonated user roles and the notification is enabled
            if (userGr.next() && that._canReceiveNotification(userGr)) {
                // Add security notification to platform
                var notificationListGr = that.addToNotifications(that.eventNames.IMPERSONATION, userGr.sys_id, userImpersonating);

                // Send email if user has it enabled
                if (that._checkNotificationEnabled(that.notificationNames.IMPERSONATION, userGr)) {
                    gs.eventQueue(that.eventNames.IMPERSONATION, notificationListGr, userGr.sys_id, userImpersonating);
                }
            }
        }

    },
    /**
     * This function will be called by the script action AppSec Event - Weekly Digest
     * to generate the weekly digest
     */
    weeklyDigest: function () {
        // Get all admin/security admin users
        var weeklyDigest = JSON.stringify(new ISCNotificationTemplateUtility().weeklyDigest());
        var allAdminGr = new GlideAggregate(this.tables.USER_HAS_ROLE);
        var allAdminQc = allAdminGr.addQuery('role', this.hpRoles[0]);
        allAdminQc.addOrCondition('role', this.hpRoles[1]);
        allAdminGr.groupBy('user');
        allAdminGr.query();
        while (allAdminGr.next()) {
            // Add security notification to platform
            var notificationListGr = this.addToNotifications(this.eventNames.WEEKLY_DIGEST, allAdminGr.user.sys_id, weeklyDigest);

            // Send email if user has it enabled
            if (this._checkNotificationEnabled(this.notificationNames.WEEKLY_DIGEST, allAdminGr.user)) {
                gs.eventQueue(this.eventNames.WEEKLY_DIGEST, notificationListGr, allAdminGr.user.sys_id, weeklyDigest);
            }
        }

    },
    /**
     * This function will be called by the buisness rule AppSec Notification - HP Role Added
     * to generate the hp role added notification
     * @param {GlideRecord} currentGr - The GlideRecord for the sys_user_has_role
     */
    hpRoleAdded: function (currentGr) {
        // Get all admin/security admin users
        var allAdminGr = new GlideAggregate(this.tables.USER_HAS_ROLE);
        var allAdminQc = allAdminGr.addQuery('role', this.hpRoles[0]);
        allAdminQc.addOrCondition('role', this.hpRoles[1]);
        allAdminGr.groupBy('user');
        allAdminGr.query();
        while (allAdminGr.next()) {
            // Data to send
            var parm2 = JSON.stringify({
                role: currentGr.role.name.toString(),
                userSysId: currentGr.user.sys_id.toString(),
            });

            // Add security notification to platform
            var notificationListGr = this.addToNotifications(this.eventNames.HP_ROLE_ADDED, allAdminGr.user.sys_id, parm2);

            // Send email if user has it enabled
            if (this._checkNotificationEnabled(this.notificationNames.HP_ROLE_ADDED, allAdminGr.user)) {
                gs.eventQueue(this.eventNames.HP_ROLE_ADDED, notificationListGr, allAdminGr.user.sys_id, parm2);
            }
        }
    },
    // Helpers
    /**
     * This function will check if the user has a role
     * @param {GlideRecord} userGr - The glide record for sys_user
     * @param {string} roleId - The sys_id of the role being checked
     */
    _checkRole: function (userGr, roleId) {
        var userRoleGr = new GlideRecord(this.tables.USER_HAS_ROLE);
        userRoleGr.addQuery('user', userGr.sys_id);
        userRoleGr.addQuery('role', roleId);
        userRoleGr.query();
        return userRoleGr.next();
    },
    /**
     * This function will insert a record to the security_dashboard_event_logs
     * @param {any} obj - This object will contain only the necessary parameters
     *                    for the type of security event being logged
     */
    _insertSecDashEventRecord: function (obj) {
        var secDashboardEventLogGr = new GlideRecord(this.tables.SECURITY_DASHBOARD_EVENT_LOGS);
        secDashboardEventLogGr.initialize();
        secDashboardEventLogGr.sec_dash_event = obj.event;
        secDashboardEventLogGr.sec_dash_description = obj.user_description;
        secDashboardEventLogGr.sec_dash_event_created = obj.createdOn;
        secDashboardEventLogGr.sec_dash_ip_addr = obj.ipAddress;
        secDashboardEventLogGr.sec_dash_event_reference = obj.reference;
        secDashboardEventLogGr.insert();
    },
    /**
     * This function will check if the user has the specific notification enabled
     * @param {string} notificationName - the notification being checked for 
     * @param {GlideRecord} userGr - the glide record of the user
     */
    _checkNotificationEnabled: function (notificationName, userGr) {
        // Check if the specific notification is enabled
        var userNotificationSettingsGr = new GlideRecord(this.tables.SECURITY_NOTIFICATIONS);
        userNotificationSettingsGr.addQuery('user.sys_id', userGr.sys_id);
        userNotificationSettingsGr.addQuery('notification.name', notificationName);
        userNotificationSettingsGr.addQuery('enable', true);
        userNotificationSettingsGr.query();

        return userNotificationSettingsGr.next();

    },
    _canReceiveNotification: function (userGr) {
        var canReceive = false;
        for (var i = 0; i < this.hpRoles.length; i++) {
            var hpRole = this.hpRoles[i];
            if (this._checkRole(userGr, hpRole)) {
                canReceive = true;
            }
        }

        return canReceive;
    },
    /**
     * This function will generate an item in our security notification list table
     * @param {string} event - The name of the event
     * @param {string} recipient - The sys_id of the user receiving the notification
     * @param {string} email - The data of the notification
     */
    addToNotifications: function (event, recipient, data) {
        var that = this;

        // Fire event queue to trigger email
        var notificationListGr = new GlideRecord(this.tables.SECURITY_NOTIFICATION_LIST);
        notificationListGr.initialize();
        notificationListGr.event = event;
        notificationListGr.label = this.eventNameToLabel[event];
        notificationListGr.user = recipient;
        notificationListGr.data = data;
        notificationListGr.description = _generateDescription(event, recipient, data);
        notificationListGr.read = false;
        notificationListGr.insert();

        return notificationListGr;

        function _generateDescription(event, recipient, data) {
            var description = 'Error fetching user information';
            var userGr = new GlideRecord('sys_user');
            var foundUser = userGr.get(recipient);
            var templateUtility = new ISCNotificationTemplateUtility();

            // Generate description based on event
            if (foundUser) {
                var name = userGr.name;
                if (event === that.eventNames.LOGIN_FAILED) {
                    description = 'There have been multiple failed login attempts for ' + name;
                } else if (event === that.eventNames.IMPERSONATION) {
                    description = data + ' has impersonated ' + name;
                } else if (event === that.eventNames.NEW_ADMIN_LOGIN) {
                    description = name + ' has logged in from a new ip address ' + data;
                } else if (event === that.eventNames.SECURITY_ELEVATION) {
                    description = 'Security admin status has been granted to ' + data;
                } else if (event === that.eventNames.HP_ROLE_ADDED) {
                    var info = JSON.parse(data);
                    var gr = new GlideRecord('sys_user');
                    gr.get(info.userSysId);
                    description = info.role + ' role was added to ' + gr.name;
                } else if (event === that.eventNames.WEEKLY_DIGEST) {
                    description = templateUtility.convertToLexicalTime(new GlideDateTime()) + ' - Weekly Digest';
                }
            }

            return description;
        }
    },
    type: 'ISCEventsUtil'
};

// Constants
ISCEventsUtil.prototype.notificationNames = {
    LOGIN_FAILED: 'Failed Login',
    IMPERSONATION: 'Impersonation',
    NEW_ADMIN_LOGIN: 'Admin Login',
    SECURITY_ELEVATION: 'Security Elevation',
    WEEKLY_DIGEST: 'Weekly Digest',
    HP_ROLE_ADDED: 'High Privilege Role'
};

ISCEventsUtil.prototype.eventNameToLabel = {
    'appsec.notification.login.failed': 'Failed Login',
    'appsec.notification.impersonation': 'Impersonation',
    'appsec.notification.login.new_ip': 'Admin Login',
    'appsec.notification.security.elevation': 'Security Elevation',
    'appsec.notification.hp_role_added': 'High Privilege Role Added',
    'appsec.notification.weekly_digest': 'Weekly Digest',
};
ISCEventsUtil.prototype.eventNames = {
    LOGIN_FAILED: 'appsec.notification.login.failed',
    IMPERSONATION: 'appsec.notification.impersonation',
    NEW_ADMIN_LOGIN: 'appsec.notification.login.new_ip',
    SECURITY_ELEVATION: 'appsec.notification.security.elevation',
    WEEKLY_DIGEST: 'appsec.notification.weekly_digest',
    HP_ROLE_ADDED: 'appsec.notification.hp_role_added',
};
ISCEventsUtil.prototype.tables = {
    SECURITY_NOTIFICATIONS: 'appsec_security_notifications',
    SECURITY_NOTIFICATION_TYPES: 'appsec_security_notification_types',
    SECURITY_NOTIFICATION_LIST: 'appsec_security_notification_list',
    SECURITY_DASHBOARD_EVENT_LOGS: 'appsec_security_dashboard_event_logs',
    USER_HAS_ROLE: 'sys_user_has_role',
};

ISCEventsUtil.prototype.hpRoles = [
    '2831a114c611228501d4ea6c309d626d', // Admin
    // 'bca873d30a000704013944bd9a5e03a4', // Impersonator
    'b2d8f7130a0a0baa5bf52498ecaadeb4', // Security Admin
    // '88a98433d7112100f20bc8170e61033e', // OAuth Admin
];
```