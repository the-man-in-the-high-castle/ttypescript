import * as ts from 'typescript';

export function es3transformer<T extends ts.SourceFile>(context: ts.TransformationContext) {
    return (rootNode: T) => {
        //console.log('sf:', rootNode.fileName);
        function visit(sourceFile: ts.Node): ts.Node {
            if (!ts.isSourceFile(sourceFile)) throw new Error('This code only works with a source file.');
            // strip this internal property to get rid of `exports.__esModule = true;`
            // eslint-disable-next-line @typescript-eslint/no-explicit-any

            delete (sourceFile as any).externalModuleIndicator;

            return ts.visitEachChild(sourceFile, (node) => converNode(node), context);
        }

        function converNode(node: ts.Node) {
            if (ts.isImportDeclaration(node) && node.moduleSpecifier) {
                return undefined;
                // const nn = context.factory.createTypeReferenceNode(
                //     `// <reference path="${node.moduleSpecifier.getText().replace(/'/g, '') + '.ts'}"/> `
                // );

                // //console.log('ImportDeclaration', { ...node.importClause?.namedBindings, parent: undefined });

                // return nn;
            }
            if (ts.isExportDeclaration(node) && node.moduleSpecifier) return;
            if (ts.isExpressionStatement(node) && checkIfModuleExport(node.expression)) return;

            return ts.visitEachChild(node, visitChilds, context);

            function visitChilds(child: ts.Node): ts.Node | undefined {
                if (child.kind == ts.SyntaxKind.ExportKeyword) return undefined;
                if (child.kind == ts.SyntaxKind.AsyncKeyword) return undefined;

                if (ts.isIdentifier(child)) {
                    child = ts.setEmitFlags(child, ts.EmitFlags.LocalName);
                } else if (ts.isAwaitExpression(child)) {
                    child = child.expression;
                } else {
                    if (ts.isTypeReferenceNode(child)) {
                        const result = transformPromise(child);
                        if (!result) return undefined;
                        child = result;
                    }
                }

                return ts.visitEachChild(child, visitChilds, context);
            }

            function transformPromise(node: ts.TypeReferenceNode) {
                if (node.typeName.getText() === 'Promise') {
                    return node.typeArguments?.[0];
                }
                return node;
            }

            function checkIfModuleExport(node: ts.Node) {
                return (
                    ts.isBinaryExpression(node) &&
                    ts.isPropertyAccessExpression(node.left) &&
                    node.left.getText() == 'module.exports'
                );
            }
        }

        return ts.visitNode(rootNode, visit);
    };
}
