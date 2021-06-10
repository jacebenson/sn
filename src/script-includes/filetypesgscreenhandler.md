---
title: "FileTypeSGScreenHandler"
id: "filetypesgscreenhandler"
---

API Name: sn_devstudio.FileTypeSGScreenHandler

```js
var FileTypeSGScreenHandler = (function(appId) {

       function loadScreens() {
               var gr = new GlideRecord('sys_sg_screen');
               gr.addQuery('sys_scope', appId);
               gr.orderBy('title');
               gr.query();
               return _gr(gr).map(function(row) {
                       return fileForRecord(row);
               });
       }

       function fileForRecord(record) {
               var sysId = record.getUniqueValue();
               var name = record.getValue('name');
               return FileTypeFileBuilder.newFile()
                       .withId(sysId)
                       .withName(name)
                       .withSysId(sysId)
                       .withAlternateName(record.getValue('sys_name'))
                       .build();
       }

       return {
               filesForKey : loadScreens
	   };

});
```