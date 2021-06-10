---
title: "FileTypeExternalFieldHandler"
id: "filetypeexternalfieldhandler"
---

API Name: sn_devstudio.FileTypeExternalFieldHandler

```js
var FileTypeExternalFieldHandler = (function(appId) {

	function loadFields() {
		var gr = new GlideRecord('sys_dictionary');
		gr.addQuery('sys_scope', appId);
		gr.addQuery('internal_type','!=','collection');
		gr.addQuery('sys_class_name', 'NOT IN', getExcludedTables());
		gr.addQuery('name','NOT IN', getScopedTables(appId));
		gr.orderBy('sys_name');
		gr.query();
		var tableLabelMap = buildTableLabelMap(gr);
		gr.query(); // Reissue the query (we don't yet have scoped access to reset the cursor)
		var fileRecords =  _gr(gr).map(function(row) {
			return fileForRecord(row, tableLabelMap);
		});
		fileRecords = _.filter(fileRecords, function(file){ return file;});
		return fileRecords;
	}

	function buildTableLabelMap(gr) {
		var tableNames = _gr(gr).map(function(row) { return row.getValue('name')});
		return TableLabelMap.labelsForTables(tableNames);
	}

	function fileForRecord(record, tableLabelMap) {
	    if (!isEligibleToUnload(record))
			return false;
		var sysId = record.getUniqueValue();
		var tableName = tableLabelMap[record.name] || record.name;
		var name = ((record.sys_name + '').trim() || record.getValue('column_label').trim() || sysId) + " [" + tableName + "]";
		return FileTypeFileBuilder.newFile()
			.withId(sysId)
			.withName(name)
			.withSysId(sysId)
			.withAlternateName(record.getValue('name') + '.' + record.getValue('column_label'))
			.build();
	}

	function isEligibleToUnload(record) {
		var targetTable = record.getValue("name");
		var targetField = record.getValue("element");

		var aTableRecord = new GlideRecord(targetTable);
		if (!aTableRecord.isValid() || !aTableRecord.isValidField(targetField))
			return false;

		var ed = aTableRecord.getElement(targetField).getED();
		if (typeof ed.getFirstTableName != 'undefined')
			return ed.getFirstTableName() == targetTable;

	return true;
}

	function getExcludedTables() {
		return [
				'sys_hub_action_input',
				'sys_hub_action_output',
				'sys_hub_step_ext_input',
				'sys_hub_step_ext_output',
				'sys_hub_flow_input',
				'sys_hub_flow_output'
		];
	}

	function getScopedTables(appId) {
		var tables = [];
		var gr = new GlideRecord('sys_dictionary');
		gr.addQuery('sys_scope', appId);
		gr.addQuery('internal_type','collection');
		gr.query();

		while(gr.next()) {
			tables.push(gr.getValue('sys_name'));
		}

		return tables.join(',');
	}

	return {
		filesForKey : loadFields
	}

});
```