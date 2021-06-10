---
title: "UpdateXMLPayloadParser"
id: "updatexmlpayloadparser"
---

API Name: sn_devstudio.UpdateXMLPayloadParser

```js
var UpdateXMLPayloadParser = (function() {
    return {
        parse: function(xmlString) {
            var doc = new XMLDocument2();
            var result = {},
                n;
            try {
                doc.parseXML(xmlString);

                var recordNode = doc.getNode('record_update/*[node()]');
                var nodeName = recordNode.getNodeName();

                //sys_documentation, sys_ui_list, sys_ui_related, sys_ui_section, sys_choice records have extra node
                if (nodeName === 'sys_documentation' ||
                    nodeName === 'sys_ui_list' ||
                    nodeName === 'sys_ui_related' ||
                    nodeName === 'sys_ui_section' ||
                    nodeName === 'sys_choice')
                    recordNode = doc.getNode('record_update/*[node()]/*[node()]');

                var recordIterator = recordNode.getChildNodeIterator();
                while (recordIterator.hasNext()) {
                    n = recordIterator.next();
                    result[n.getNodeName()] = n.getTextContent();
                }
            } catch (e) {
                gs.error("Invalid payload of sys_update_xml " + xmlString);
            }

            return result;
        }
    };

})();
```