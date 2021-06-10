---
title: "CompositeElement"
id: "compositeelement"
---

API Name: global.CompositeElement

```js
var CompositeElement = Class.create();

CompositeElement.prototype = {
  initialize : function(fullName) {
    this.ce = new GlideCompositeElement(fullName);
  },

  getFullLabel : function() {
    return this.ce.getFullLabel();
  }
}
```