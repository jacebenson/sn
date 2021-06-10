---
title: "FileTypeExtensionInstanceHandler"
id: "filetypeextensioninstancehandler"
---

API Name: sn_devstudio.FileTypeExtensionInstanceHandler

```js
var FileTypeExtensionInstanceHandler = function(appId, appExplorerStructure) {
	
	function loadFiles(navKey) {
		var gr = new GlideRecord(navKey);
		if(appId) {
			gr.addQuery('sys_scope', appId);
			gr.orderBy('sys_name');
			gr.query();
		}
		
		var files = [];
		while (gr.next()) {
			var file = fileForRecord(gr);
			files.push(file);
		}
		
		return files;
	}
	
	function filesForKey(navigationKey) {
		return loadFiles(navigationKey);
	}
		
	function fileForRecord(record) {
		var sysId = record.getUniqueValue();
		
		var name = record.getValue('sys_name');
		if (!name || name.trim() === '')
			name = sysId;
		
		var instanceName = getInstanceName(record);
		if (instanceName)
			name += " [" + instanceName + "]";
		
		var recordType = record.getValue('sys_class_name');
		
		return FileTypeFileBuilder.newFile()
			.withId(recordType + '.' + sysId)
			.withName(name)
			.withSysId(sysId)
			.build();
	}
	
	function getInstanceName(record) {
		var fieldMap = {
			'sys_extension_instance' : 'script_include',
			'sys_script_include' : 'name',
			'sys_client_extension_instance' : 'ui_script',
			'sys_ui_script' : 'script_name',
			'sys_ui_extension_instance' : 'ui_macro',
			'sys_ui_macro' : 'name'
		}
		var implName = '';
		
		var recordClass = record.getRecordClassName();
		var implClassField = fieldMap[recordClass];
		if (!record.isValidField(implClassField))
			return implName;
		
		if (!record.getValue(implClassField))
			return implName;
		
		var referencedRecord = record[implClassField].getRefRecord();
		if (!referencedRecord || !referencedRecord.isValidRecord())
			return implName;
		
		var implementationClassName = referencedRecord.getRecordClassName();
		if(!fieldMap[implementationClassName])
			return implName;

		var implementationNameField = fieldMap[implementationClassName];
		if (!referencedRecord.isValidField(implementationNameField))
			return implName;
		
		return referencedRecord.getValue(implementationNameField);
	}
	
	return {
		filesForKey : filesForKey
	};
	
};
							  
```