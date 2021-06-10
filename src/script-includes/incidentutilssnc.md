---
title: "IncidentUtilsSNC"
id: "incidentutilssnc"
---

API Name: global.IncidentUtilsSNC

```js
var IncidentUtilsSNC = Class.create();
IncidentUtilsSNC.prototype = {
    INCIDENT: 'incident',
    ATTR_DOMAIN: 'sys_domain',
    ATTR_PARENT_INCIDENT: 'parent_incident',
    ATTR_WORK_NOTES: "work_notes",
    ATTR_NUMBER: "number",
    COPY_IF_ACTIVE_ATTRS: ['parent_incident', 'problem_id', 'rfc'],
    ALWAYS_IGNORE_ATTRS: ['active', 'additional_assignee_list', 'child_incidents', 'close_code', 'close_notes', 'closed_at', 'closed_by', 'created', 'created_by', 'hold_reason', 'knowledge', 'made_sla', 'notify', 'number', 'opened_at', 'opened_by', 'reassignment_count', 'reopen_count', 'resolved_at', 'resolved_by', 'sys_id', 'sys_domain', 'sys_mod_count', 'time_worked', 'updated', 'updated_by', 'watch_list', 'work_notes_list'],
    PROP_INCIDENT_COPY_RELATED_LISTS: 'com.snc.incident.copy.related_lists',
    PROP_INCIDENT_COPY_ATTRS: 'com.snc.incident.copy.attributes',
    PROP_INCIDENT_COPY_ENABLED: 'com.snc.incident.copy.enable',
    PROP_CREATE_CHILD_INCIDENT: 'com.snc.incident.create.child.enable',
    PROP_INCIDENT_COPY_ATTACH: 'com.snc.incident.copy.attach',
    PROP_GLIDE_SYS_TZ: 'glide.sys.default.tz',
    PROP_GLIDE_SYS_DATE_FORMAT: 'glide.sys.date_format',
    PROP_GLIDE_SYS_TIME_FORMAT: 'glide.sys.time_format',
    TZ_UTC: 'UTC',
    DEFAULT_DATE_FORMAT: 'yyyy-MM-dd',
    DEFAULT_TIME_FORMAT: 'HH:mm:ss',
    INCIDENT_DEFAULT_ATTR_VALUE: 'assignment_group,business_service,category,caused_by,cmdb_ci,company,description,impact,location,parent_incident,problem_id,rfc,short_description,subcategory,urgency',
    RELATED_TABLES_MAP: {
        'task_cmdb_ci_service': {
            property: 'com.snc.incident.copy.rl.task_cmdb_ci_services.attributes',
            parentAttr: 'task',
            defaultValue: 'cmdb_ci_service',
            key: 'cmdb_ci_service'
        },
        'task_ci': {
            property: 'com.snc.incident.copy.rl.task_ci.attributes',
            parentAttr: 'task',
            defaultValue: 'ci_item',
            key: 'ci_item'
        }
    },
    ACTION_TYPE: {
        COPY_INCIDENT: "copy_incident",
        CREATE_CHILD_INCIDENT: "create_child_incident"
    },

    initialize: function() {
        this.arrayUtil = new ArrayUtil();
    },

    copyIncidentAttachments: function(srcSysId, targetSysId) {
        var isCopyEnabled = gs.getProperty(this.PROP_INCIDENT_COPY_ATTACH, 'true') == 'true';
        if (isCopyEnabled) {
            var gr = new GlideRecord(this.INCIDENT);
            if (gr.get(srcSysId) && gr.canRead())
                return this._copyAttachments(gr, targetSysId);
            else
                this.log.logWarning('copyIncidentAttachments: Provided INCIDENT does not exist or the user is not authorized to perform this action- ' + srcSysId);
        }
    },

    copyIncidentRelatedLists: function(srcIncSysID, newIncSysID) {
        var relatedTables = this._getCsvPropertyValue(this.PROP_INCIDENT_COPY_RELATED_LISTS, '');
        for (var i = 0; i < relatedTables.length; ++i) {
            var table = relatedTables[i];
            var ans = this._makeRelatedTableCopy(srcIncSysID, newIncSysID, table);
            if (!this._isSet(ans)) {
                this.log.logWarning('copyIncidentRelatedLists: Could not copy related table ' + table);
                return false;
            }
        }
        return true;
    },

    makeRelatedTableCopy: function( /*String*/ srcParentSysId,
        /*String*/
        targetParentSysId,
        /*String*/
        table,
        /*String*/
        key,
        /*String*/
        parentAttr,
        /*Array*/
        copyAttrs) {
        var ans = [];
        copyAttrs = this.arrayUtil.diff(copyAttrs, this.ALWAYS_IGNORE_ATTRS, [parentAttr]);
        var srcGr = new GlideRecord(table);
        if (srcGr.isValid()) {
            var existingRecords = [];
            srcGr.addQuery(parentAttr, srcParentSysId);
            srcGr.query();

            if (key)
                existingRecords = this._getTargetRelatedRecordKeys(table, key, parentAttr, targetParentSysId);

            while (srcGr.next()) {
                if ((key && this.arrayUtil.contains(existingRecords, srcGr.getValue(key))) || !srcGr.canRead())
                    continue;

                var newSysId = this._makeRelatedRecordCopy(srcGr, copyAttrs, parentAttr, targetParentSysId);
                if (newSysId)
                    ans.push(newSysId);
                else
                    this.log.logWarning('makeRelatedTableCopy: Could not copy related table ' + table);
            }

            return ans;
        } else
            this.log.logWarning('makeRelatedTableCopy: Invalid table ' + table);
    },

    getRedirectUrlForIncidentForm: function(actionVerb, sysId) {
        return this._getRedirectUrlForForm(actionVerb, sysId, this.INCIDENT);
    },

    getCsvValue: function(val) {
        val = val.trim().split(',');
        for (var i = 0; i < val.length;) {
            val[i] = val[i].trim();
            if (!val[i]) {
                val.splice(i, 1);
            } else {
                i++;
            }
        }
        return val;
    },
	
    _isMajorIncident: function(current) {
        if (!pm.isActive("com.snc.incident.mim"))
            return false;
        return current.major_incident_state == "accepted";
    },

    canResolveIncident: function(current) {
        if (current.incident_state == IncidentState.CLOSED || current.incident_state == IncidentState.RESOLVED || current.incident_state == IncidentState.CANCELED)
            return false;
        if (gs.hasRole("itil_admin,itil,sn_incident_write"))
            return true;
        if (current.caller_id == gs.getUserID())
            return !this._isMajorIncident(current);
        return false;
    },

    canCloseIncident: function(current) {
        if (current.incident_state != IncidentState.RESOLVED)
            return false;
        if (gs.hasRole("itil_admin"))
            return true;
        if (this._isMajorIncident(current))
            return (current.caller_id == gs.getUserID() && gs.getUser().hasRoles()) || gs.hasRole("major_incident_manager");
        else if (current.caller_id == gs.getUserID())
            return true;
        return false;
    },

    canReopenIncident: function(current) {
        return current.incident_state == IncidentState.RESOLVED && !gs.getUser().hasRoles() && !this._isMajorIncident(current);
    },

    isCopyIncidentFlagValid: function() {
        var isCopyIncidentPropEnabled = gs.getProperty(this.PROP_INCIDENT_COPY_ENABLED, 'false');

        return isCopyIncidentPropEnabled == 'true';
    },

    isCreateChildIncidentFlagValid: function() {
        var isCreateChildIncidentEnabled = gs.getProperty(this.PROP_CREATE_CHILD_INCIDENT, 'false');

        return isCreateChildIncidentEnabled == 'true';
    },

    _isCreateChildIncidentAction: function(uiActionType) {
        return uiActionType == this.ACTION_TYPE.CREATE_CHILD_INCIDENT;
    },

    _getAttributeList: function() {
        var fieldList = this._getCsvPropertyValue(this.PROP_INCIDENT_COPY_ATTRS, this.INCIDENT_DEFAULT_ATTR_VALUE);
        return this.arrayUtil.diff(fieldList, this.ALWAYS_IGNORE_ATTRS);
    },

    _isCopyIncidentAction: function(action) {
        return action == this.ACTION_TYPE.COPY_INCIDENT;
    },

    _copyAttachments: function(srcGr, targetSysId) {
        var res = [];
        if (srcGr.hasAttachments()) {
            var table = srcGr.getTableName();
            res = j2js(GlideSysAttachment.copy(table, srcGr.getUniqueValue(), table, targetSysId));
        }
        return res;
    },

    _makeRelatedTableCopy: function(srcParentSysId, targetParentSysId, table) {
        var map = this.RELATED_TABLES_MAP[table];
        if (!map) {
            this.log.logWarning('_makeRelatedTableCopy: Unsupported related table ' + table);
            return;
        }
        var key = map.key;
        var parentAttr = map.parentAttr;
        var copyAttrs = this._getCsvPropertyValue(map.property, map.defaultValue);
        return this.makeRelatedTableCopy(srcParentSysId, targetParentSysId, table, key, parentAttr, copyAttrs);
    },

    _makeRelatedRecordCopy: function(srcGr, copyAttrs, parentAttr, targetParentSysId) {
        var gr = this._makeRecordCopy(srcGr, copyAttrs);
        gr.setValue(parentAttr, targetParentSysId);
        if (gr.canCreate())
            return gr.insert();
    },

    _makeRecordCopy: function(srcGr, copyAttrs) {
        var table = srcGr.getTableName();
        var gr = new GlideRecord(table);
        gr.initialize();
        for (var i = 0; i < copyAttrs.length; ++i) {
            var field = copyAttrs[i];
            if (srcGr.isValidField(field))
                gr.setValue(field, srcGr.getValue(field));
            else
                this.log.logWarning("_makeRecordCopy: Invalid field '" + field + "' provided for table '" + table + "'.");
        }
        return gr;
    },

    _getTargetRelatedRecordKeys: function(table, key, parentAttr, targetParentSysId) {
        var ans = [];
        var gr = new GlideRecord(table);
        gr.addQuery(parentAttr, targetParentSysId);
        gr.query();
        while (gr.next()) {
            ans.push(gr.getValue(key));
        }
        return ans;
    },

    _isSet: function(obj) {
        // Unlike browsers, Rhino condition evaluation
        // returns false when the passed obj is array
        // and has length 0. We want the browser behavior.
        return obj || JSUtil.type_of(obj) === 'object';
    },

    _getRecordValuesAsEncodedQuery: function(record, attributesList, uiActionType) {
        var table = record.getTableName();
        var gr = new GlideRecord(table);
        var activeAttrsToCopy = [];
        // If action is of type "Copy Incident", loop through COPY_IF_ACTIVE_ATTRS list,
        // and skip copying inactive fields.
        if (this._isCopyIncidentAction(uiActionType)) {
            for (var index = 0; index < this.COPY_IF_ACTIVE_ATTRS.length; index++) {
                var attr = this.COPY_IF_ACTIVE_ATTRS[index];
                var activeIndex = attributesList.indexOf(attr);
                if (activeIndex != -1) {
                    attributesList.splice(activeIndex, 1);
                    if (record[attr].active == 1)
                        activeAttrsToCopy.push(attr);
                }
            }
        }

        for (var i = 0; i < attributesList.length; ++i) {
            var name = attributesList[i];
            if (record.isValidField(name)) {
                if (record.getValue(name)) {
                    if (!gs.nil(record.getElement(name)) && !gs.nil(record.getElement(name).getED())) {
                        var ed = record.getElement(name).getED();
                        // We have to use the display value if it's a date based field for form filter
                        if (ed.getInternalType() == "glide_date_time" || ed.isEncrypted())
                            gr.addQuery(name, record.getDisplayValue(name));
                        else
                            gr.addQuery(name, record.getValue(name));
                    } else
                        gr.addQuery(name, record.getValue(name));
                }
            } else
                this.log.logWarning("Invalid field '" + name + "' provided for table '" + table + "'.");
        }

        if (this._isCopyIncidentAction(uiActionType)) {
            for (var j = 0; j < activeAttrsToCopy.length; j++) {
                gr.addQuery(activeAttrsToCopy[j], record.getValue(activeAttrsToCopy[j]));
            }
            gr.addQuery(this.ATTR_WORK_NOTES, gs.getMessage('Created from a similar incident {0}', record.getValue(this.ATTR_NUMBER)));
        }

        if (this._isCreateChildIncidentAction(uiActionType)) {
            gr.addQuery(this.ATTR_PARENT_INCIDENT, record.getUniqueValue());
            gr.addQuery(this.ATTR_DOMAIN, record.getValue(this.ATTR_DOMAIN));
        }

        return gr.getEncodedQuery();
    },

    _getRedirectUrlForForm: function(actionVerb, sysId, table) {
        var urlOnStack = '';
        var suffix = '_and_stay';
        if (!JSUtil.nil(actionVerb) && ((actionVerb.indexOf(suffix, actionVerb.length - suffix.length) !== -1))) {
            var gu = new GlideURL(table + '.do');
            gu.set('sys_id', sysId);
            var createdIncidentUrl = gu.toString();
            urlOnStack = createdIncidentUrl;
        } else {
            if (!gs.getSession().getStack().isEmpty())
                urlOnStack = gs.getSession().getStack().pop();
            if (JSUtil.nil(urlOnStack))
                urlOnStack = 'welcome.do';
        }
        return urlOnStack;
    },

    _getCsvPropertyValue: function(ppty, defaultVal) {
        var val = gs.getProperty(ppty, defaultVal);
        return this.getCsvValue(val);
    },

    getGlideStackURL: function(stackName) {
        var stack = gs.getSession().getStack(stackName);
        return {
            url: stack.back()
        };
    },

    setGlideStackURL: function(url, stackName) {
        var stack = gs.getSession().getStack(stackName);
        var stackUrl = stack.push(url);
        return {
            url: stackUrl
        };
    },

    getTopGlideStackURL: function(stackName) {
        var stack = gs.getSession().getStack(stackName);
        return {
            url: stack.top()
        };
    },
    canCreateRecord: function(tableName) {
        return GlideTableDescriptor.get(tableName).canCreate();
    },
    isChatEnabled: function() {
        return GlideCollaborationCompatibility.isChatEnabled() && GlideCollaborationCompatibility.isFrameSetEnabled();
    },

    /*method which needs to be in TCM, but for lack of addDomainQuery is placed here. Move back when PRB1261386 is fixed*/
    getPlanInstanceGr: function(planInstanceTable, sourceRecordGr) {
        var planInstanceCheckGr = new GlideRecord(planInstanceTable);
        planInstanceCheckGr.addQuery('source', sourceRecordGr.getUniqueValue());
        planInstanceCheckGr.addNotNullQuery('comm_plan_definition');
        planInstanceCheckGr.addDomainQuery(sourceRecordGr);
        planInstanceCheckGr.query();
        return planInstanceCheckGr;
    },

    /*method which needs to be in TCM, but for lack of addDomainQuery is placed here. Move back when PRB1261386 is fixed*/
    getPlanDefinitionGr: function(sourceRecordGr, planDefsAlreadyAttached) {
        var planDefGr = new GlideRecord('comm_plan_definition');
        planDefGr.addActiveQuery();
        planDefGr.addQuery('table', sourceRecordGr.getRecordClassName() + '');
        planDefGr.addQuery('condition_based', true);
        planDefGr.addQuery('sys_id', 'NOT IN', planDefsAlreadyAttached.join(','));
        planDefGr.addDomainQuery(sourceRecordGr);
        planDefGr.orderBy('order');
        planDefGr.query();
        return planDefGr;
    },

    /*method which needs to be in TCM, but for lack of addDomainQuery is placed here. Move back when PRB1261386 is fixed*/
    getTaskDefinitionGr: function(planInstanceGr) {
        var planTaskDefGr = new GlideRecord('comm_task_definition');
        planTaskDefGr.addActiveQuery();
        planTaskDefGr.addQuery('comm_plan_definition', planInstanceGr.comm_plan_definition);
        planTaskDefGr.addDomainQuery(planInstanceGr);
        planTaskDefGr.orderBy('order');
        planTaskDefGr.query();
        return planTaskDefGr;
    },

    /*method which needs to be in TCM, but for lack of addDomainQuery is placed here. Move back when PRB1261386 is fixed*/
    getChannelDefintionGr: function(channelDefTable, planTaskDef, planTaskGr, channel) {
        var channelDefGr = new GlideRecord(channelDefTable);
        if (!channelDefGr.isValid())
            return false;

        channelDefGr.addQuery('comm_task_definition', planTaskDef);
        channelDefGr.addDomainQuery(planTaskGr);
        channelDefGr.query();
        return channelDefGr;
    },

    /*method which needs to be in TCM, but for lack of addDomainQuery is placed here. Move back when PRB1261386 is fixed*/
    getContactDefinitionGr: function(planGr) {
        var contactDefGr = new GlideRecord('comm_contact_definition');
        contactDefGr.addQuery('comm_plan_definition', planGr.comm_plan_definition);
        contactDefGr.addDomainQuery(planGr);
        contactDefGr.query();
        return contactDefGr;
    },

    formatTimeForINCTimeline: function(gdt) {
        var sdt = new GlideScheduleDateTime(gdt);
        sdt.setTimeZone(gs.getProperty(this.PROP_GLIDE_SYS_TZ, this.TZ_UTC));
        gdt.setTZ(sdt.getTimeZone());
        return gdt.getLocalDate().getByFormat(gs.getProperty(this.PROP_GLIDE_SYS_DATE_FORMAT, this.DEFAULT_DATE_FORMAT)) + " " + gdt.getLocalTime().getByFormat(gs.getProperty(this.PROP_GLIDE_SYS_TIME_FORMAT, this.DEFAULT_TIME_FORMAT)) + "(" + sdt.getTimeZoneID() + ")";
    },

    getUserById: function(userId) {
        var g_user = GlideUser.getUser(userId);
        if (g_user)
            return g_user.getFullName();

        return gs.getMessage("Unknown");
    },

    getProblemFromIncident: function(current) {
        if (!current.isValidRecord())
            return undefined;

        var prob = new GlideRecord("problem");
        var defaultCreateFromIncidentPropVal = 'number,description,short_description,cmdb_ci,impact,urgency,priority,company,sys_domain,business_service,service_offering';
        var createFromIncidentPropVal = gs.getProperty('com.snc.problem.create_from_incident.attributes', defaultCreateFromIncidentPropVal);
        var fieldsToBeCopiedFromIncident = this.getCsvValue(createFromIncidentPropVal);

        for (var i = 0; i < fieldsToBeCopiedFromIncident.length; i++) {
            if (fieldsToBeCopiedFromIncident[i] === 'number') {
                if (prob.isValidField("first_reported_by_task"))
                    prob.first_reported_by_task = current.getUniqueValue();

            } else if (fieldsToBeCopiedFromIncident[i] === 'category') {
                var elCategory = prob.getElement("category");
                var choicesCategory = elCategory.getChoices();
                if (choicesCategory && choicesCategory.indexOf(current.category) >= 0)
                    prob.category = current.category;

            } else if (fieldsToBeCopiedFromIncident[i] === 'subcategory') {
                var elSubcategory = prob.getElement("subcategory");
                var choicesSubcategory = elSubcategory.getChoices(current.category);
                if (choicesSubcategory && choicesSubcategory.indexOf(current.subcategory) >= 0)
                    prob.subcategory = current.subcategory;

            } else if (prob.isValidField(fieldsToBeCopiedFromIncident[i])) {
                prob[fieldsToBeCopiedFromIncident[i]] = current[fieldsToBeCopiedFromIncident[i]];

            } else {
                gs.addErrorMessage(gs.getMessage("{0} is not a valid field in Problem", fieldsToBeCopiedFromIncident[i]));
                return undefined;
            }
        }
        return prob;
    },

    getUserByIdObj: function(userId) {
        var gUser = GlideUser.getUserByID(userId);
        return gUser;
    },

    canCreateKnowledgeGap: function(incidentGr) {
        return incidentGr.incident_state != IncidentState.CLOSED;
    },

    type: 'IncidentUtilsSNC'
};
```