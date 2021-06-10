---
title: "NoteTemplateCheck"
id: "notetemplatecheck"
---

API Name: sn_templated_snip.NoteTemplateCheck

```js
var NoteTemplateCheck = Class.create();
NoteTemplateCheck.prototype = {
    initialize: function() {},

    /*
     * hasAvailableTemplate method validates if given record
     * has any templated response
     * @input  currentTable: String , sys_id: String
     * @output  Boolean
     * 
     */
    hasAvailableTemplate: function(currentTable, sysId) {
        var templateConfigurationGr = this._getTemplateConfigurationsGrForTable(currentTable);
        //for each template configuration validate if the given sys_id meets the condition.
        while (templateConfigurationGr.next()) {
            if (this._isTemplateConfigConditionMatchCurrentRecord(templateConfigurationGr, currentTable, sysId))
                return true;
        }
        return false;
    },

    /*
     * isUserGroupVisible() method validates if user is in Response Visibility Group; 
     * used by ACLs
     * @input  current record in Template Configuration Table: 
     * @output  Boolean
     */
    isUserGroupVisible: function(templateConfigurationGr) {
        var visibilityList = templateConfigurationGr.getValue('group_visibility');

        // If visibility list empty, all groups are allowed
        if (!visibilityList)
            return true;

        // Check for User's membership in allowed groups
        var gr = new GlideRecord('sys_user_grmember');
        gr.addQuery('user', gs.getUserID());
        gr.addQuery('group', 'IN', visibilityList);
        gr.setLimit(1);
        gr.query();

        return gr.hasNext();
    },

    /*
     * Below method validates if for the given table or its parents has any 
     * template configuration.
     * @input currenTable : String
     * @output noteTempConfigGR : GlideRecord
     */
    _getTemplateConfigurationsGrForTable: function(currentTable) {
        var tableParent = new GlideTableHierarchy(currentTable).getBase();
        var table = currentTable;

        // add the current table to parentlist
        var tableParentList = [];
        tableParentList.push(table);

        //get all the parents of the current table
        while (tableParent != table) {
            tableParentList.push(tableParent);
            table = tableParent;
            tableParent = new GlideTableHierarchy(table).getBase();
        }

        //comma separated values of the parent list
        var tableAncestors = tableParentList.join();

        var noteTempConfigGR = new GlideRecordSecure("sn_templated_snip_note_template");
        noteTempConfigGR.addQuery("table", "IN", tableAncestors);
        noteTempConfigGR.query();

        return noteTempConfigGR;
    },


    /*
     * For the given table name sysid and Template configuration Glide Record.
     * below method validates if the record meets the condition inside template 
     * configuration
     * @input templateConfigurationGr: GlideRecord, currentTableName: String, 
     * sysId : String
     * @output : Boolean
     */
    _isTemplateConfigConditionMatchCurrentRecord: function(templateConfigurationGr, currentTableName, sysId) {

        if (templateConfigurationGr == null || !currentTableName || !sysId)
            return false;

        var condition = templateConfigurationGr.getValue("condition") == null ? "" : templateConfigurationGr.getValue("condition").toString();

        var currentTableGr = new GlideRecord(currentTableName);
        if (condition)
            currentTableGr.addEncodedQuery(condition);
        currentTableGr.addQuery('sys_id', sysId);
        currentTableGr.setLimit(1);
        currentTableGr.query();
        if (currentTableGr.hasNext())
            return true;
        return false;
    },


    // Generate category list
    getCategories: function(tableName, sysId) {
        var countCategories = 0;
        var maxCatergories = gs.getProperty("sn_templated_snip.max_template_responses", 500);
        var categories = [];
        var defaultSelectMessage = gs.getMessage("Select a response template");
        categories.push("----" + defaultSelectMessage + "----");
        var templateConfigurationGr = this._getTemplateConfigurationsGrForTable(tableName);
        while (templateConfigurationGr.next()) {
            if (this._isTemplateConfigConditionMatchCurrentRecord(templateConfigurationGr, tableName, sysId)) {
                categories.push(templateConfigurationGr.name.toString());
                countCategories++;
            }
            if (countCategories > maxCatergories)
                break;
        }
        return categories;
    },

    /*
     * Checks user's access permission to response template
     * @params:
     *  responseTemplateTable: string value of table name
     *  accessType: string value for type of access.
     *    Access types supported: 'read', 'write', 'delete'
     * @returns:
     *  boolean: true if user satisfies role requirements for accessType
     *           false otherwise
     */
    canAccessHRResponseTemplate: function(responseTemplateTable, accessType) {
        var pluginManager = new GlidePluginManager();
        var HRCoreActive = pluginManager.isActive('com.sn_hr_core');
        var LEActive = pluginManager.isActive('com.sn_hr_lifecycle_events');
        var isHRCoreTable = responseTemplateTable.startsWith('sn_hr_core');
        var isLETable = responseTemplateTable.startsWith('sn_hr_le');
        var user = gs.getUser();

        switch (accessType) {

            case 'read':
                if (isHRCoreTable)
                    return HRCoreActive && user.hasRole('sn_hr_core.case_writer');
                if (isLETable)
                    return LEActive && user.hasRole('sn_hr_le.case_writer');
                break;

            case 'write': //using fall-through as both the access type require similar roles for access
            case 'delete':
                if (isHRCoreTable)
                   return HRCoreActive && user.hasRole('sn_hr_core.manager');
                if (isLETable)
                    return LEActive && user.hasRole('sn_hr_le.admin');
                break;
        }

        return false;
    },

    type: 'NoteTemplateCheck'
};
```