---
title: "UpgradeHistoryTaskUtil"
id: "upgradehistorytaskutil"
---

API Name: global.UpgradeHistoryTaskUtil

```js
var UpgradeHistoryTaskUtil = Class.create();

UpgradeHistoryTaskUtil.DISPOSITIONS = {
    'INSERTED': '1',
    'UPDATED': '2',
    'DELETED': '3',
    'SKIPPED': '4',
    'REVERTED': '5',
    'TABLE_NOT_FOUND': '6',
    'UNCHANGED': '7',
    'SKIPPED_ERROR': '9',
    'SKIPPED_MERGED_MANUAL': '10',
    'SKIPPED_APPLY_ONCE': '11',
    'NOT_LATEST': '12',
    'INSERTED_SECOND_PASS': '101',
    'UPDATED_SECOND_PASS': '102',
    'DELETED_SECOND_PASS': '103',
    'SKIPPED_SECOND_PASS': '104',
	'REVERTED_SECOND_PASS': '105',
    'TABLE_NOT_FOUND_SECOND_PASS': '106',
    'UNCHANGED_SECOND_PASS': '107',
    'BASE_INSERTED': '201',
    'BASE_UPDATED': '202',
    'BASE_DELETED': '203',
    'FATAL_ERROR': '301',
    'NOT_LOADED': '302',
    'SANITIZED': '303'
};

UpgradeHistoryTaskUtil.UPGRADE_HISTORY_TASK = 'upgrade_history_task';
UpgradeHistoryTaskUtil.SYS_UPGRADE_HISTORY_LOG = 'sys_upgrade_history_log';

UpgradeHistoryTaskUtil.canResolveConflictsCustomerUpdated = function(upgradeHistoryLogId) {
    var upgradeHistoryLogGr = GlideRecord(UpgradeHistoryTaskUtil.SYS_UPGRADE_HISTORY_LOG);
    if (upgradeHistoryLogGr.get(upgradeHistoryLogId))
        return upgradeHistoryLogGr.canRead() && (upgradeHistoryLogGr.getValue('disposition') == UpgradeHistoryTaskUtil.DISPOSITIONS.SKIPPED ||
			upgradeHistoryLogGr.getValue('disposition') == UpgradeHistoryTaskUtil.DISPOSITIONS.SKIPPED_MERGED_MANUAL);

    return false;
};

UpgradeHistoryTaskUtil.canRevertToBaseSystem = function(upgradeHistoryLogId) {
    var upgradeHistoryLogGr = GlideRecord(UpgradeHistoryTaskUtil.SYS_UPGRADE_HISTORY_LOG);
    if (upgradeHistoryLogGr.get(upgradeHistoryLogId))
        return upgradeHistoryLogGr.canRead() && UpgradeHistoryTaskUtil.hasBaseVersion(upgradeHistoryLogId) &&
			(upgradeHistoryLogGr.getValue('disposition') == UpgradeHistoryTaskUtil.DISPOSITIONS.SKIPPED ||
			upgradeHistoryLogGr.getValue('disposition') == UpgradeHistoryTaskUtil.DISPOSITIONS.SKIPPED_ERROR);

    return false;
};

UpgradeHistoryTaskUtil.hasBaseVersion = function(upgradeHistoryLogId) {

    var current = new GlideRecord('sys_upgrade_history_log');
    current.get(upgradeHistoryLogId);

    var name = current.file_name;
    var grHead = GlideappUpdateVersion.getHeadVersion(name);
    if (grHead.isValidRecord()) {
        current.payload = grHead.payload;
    }

    // if the record is from a store app, the baseline version has its source_table and source set to sys_store_app and the app ID
    var storeAppID = UpgradeHistoryTaskUtil.getStoreAppID(name);
    var grBaselineHead;
    if (storeAppID != null)
        grBaselineHead = GlideappUpdateVersion.getVersion(name, storeAppID, "sys_store_app", null);
    else
        grBaselineHead = GlideappUpdateVersion.getVersion(name, current.upgrade_history, "sys_upgrade_history", null);

    if (grBaselineHead.isValidRecord())
		return true;

	return false;
};

UpgradeHistoryTaskUtil.getStoreAppID = function(name) {
    var gr = new GlideRecord('sys_metadata');
    gr.addQuery('sys_update_name', name);
    gr.query();
    if (gr.next()) {
        var actualGR = new GlideRecord(gr.sys_class_name);
        if (actualGR.get(gr.sys_id) && actualGR.isInStoreScope()) {
            if (!actualGR.isValidField("sys_scope"))
                return null;

            return actualGR.sys_scope.toString();
        }
    }

    return null;
}

UpgradeHistoryTaskUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getHistoryLogId: function() {
		var response = {};
		var historyTaskId = this.getParameter('historyTaskId');
		var historyTaskGr = new GlideRecord(UpgradeHistoryTaskUtil.UPGRADE_HISTORY_TASK);
		if (historyTaskGr.get(historyTaskId))
			response.historyLogId = historyTaskGr.getValue('upgrade_detail');
		else
			response.historyLogId = 'NOT_FOUND';

		return JSON.stringify(response);
	},

    type: 'UpgradeHistoryTaskUtil'
});
```