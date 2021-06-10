---
title: "ContentAuditUtil"
id: "contentauditutil"
---

API Name: global.ContentAuditUtil

```js
var ContentAuditUtil = Class.create();

ContentAuditUtil.AUDIT_TABLE = 'asset_content_audit';

ContentAuditUtil.addAuditEntry = function(table, id, column, oldValue, newValue, comments, className, oldInternalValue, newInternalValue) {
	var auditEntry = new GlideQuery(ContentAuditUtil.AUDIT_TABLE)
	.insert({
		table_name: table,
		document_key: id,
		field_name: column,
		old_value: oldValue,
		new_value: newValue,
		comments: ContentAuditUtil.formatMessage(comments),
		sys_class_name: className,
		old_internal_value: oldInternalValue,
		new_internal_value: newInternalValue
	});
};

//Function to format a message to be meaningful and readable
ContentAuditUtil.formatMessage = function(msg){
	//split the message into lines
	var lines = msg.split("\n");
	var formattedMsg="";
	//format each line correctly
	lines.forEach(function(line){
		if(line !== null && line !== ""){
			var msgSubStrs = line.split(" : ");
			if(msgSubStrs.length > 2){
				//validate table name n record count
				var tabName = msgSubStrs[0];			
				var recCount = msgSubStrs[1];
				var gr = new GlideRecord(tabName);
			
				if(gr.isValid() && !isNaN(recCount)){
					formattedMsg = formattedMsg + "Updated table: " + tabName + ", " + "Number of records processed: " + recCount + ", " +"Time elapsed to update: " + msgSubStrs[2] + "\n";	
				}
				else
					formattedMsg = formattedMsg + line + "\n";
			}
			else
				formattedMsg = formattedMsg + line + "\n";
		}
	});
	
	return formattedMsg;
};

ContentAuditUtil.prototype = {
    initialize: function() {
    },
	
    type: 'ContentAuditUtil'
};
```