const FORBIDDEN_PROPS = new Set(["onClick", "onTouchStart", "onTouchMove", "onTouchEnd"]);

/** @type {import('eslint').Rule.RuleModule} */
export const noForbiddenProps = {
  meta: {
    type: "problem",
    docs: {
      description: "Disallow forbidden event props on Badge and Panel components",
    },
    messages: {
      forbiddenProp:
        '"{{component}}" does not accept {{prop}}. Wrap it in a <{{wrapper}}> instead.',
    },
    schema: [],
  },
  create(context) {
    return {
      JSXOpeningElement(node) {
        const name =
          node.name.type === "JSXIdentifier" ? node.name.name : null;
        if (name !== "Badge" && name !== "Panel") return;

        const wrapper = name === "Badge" ? "button" : "div";

        for (const attr of node.attributes) {
          if (
            attr.type !== "JSXAttribute" ||
            attr.name.type !== "JSXIdentifier"
          )
            continue;
          const propName = attr.name.name;
          if (!FORBIDDEN_PROPS.has(propName)) continue;

          context.report({
            node: attr,
            messageId: "forbiddenProp",
            data: {
              component: name,
              prop: propName,
              wrapper,
            },
          });
        }
      },
    };
  },
};
