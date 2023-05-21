import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';
import { es3transformer } from './es3.transformer';

export function applyBefore(
    tsm: typeof ts,
    { prepend = false, outFileDir }: { prepend?: boolean; outFileDir?: string } = {}
) {
    console.log('applyBefore');

    const org_createSolutionBuilderWithWatchHost = tsm.createSolutionBuilderWithWatchHost;
    tsm.createSolutionBuilderWithWatchHost = <
        T extends ts.BuilderProgram = ts.EmitAndSemanticDiagnosticsBuilderProgram
    >(
        system?: ts.System,
        createProgram?: ts.CreateProgram<T>,
        reportDiagnostic?: ts.DiagnosticReporter,
        reportSolutionBuilderStatus?: ts.DiagnosticReporter,
        reportWatchStatus?: ts.WatchStatusReporter
    ): ts.SolutionBuilderWithWatchHost<T> => {
        console.log('createSolutionBuilderWithWatchHost +');

        const host = org_createSolutionBuilderWithWatchHost(
            system,
            createProgram,
            reportDiagnostic,
            reportSolutionBuilderStatus,
            reportWatchStatus
        );

        apply(host);
        return host;
    };

    const org_createSolutionBuilderHost = tsm.createSolutionBuilderHost;
    tsm.createSolutionBuilderHost = <T extends ts.BuilderProgram = ts.EmitAndSemanticDiagnosticsBuilderProgram>(
        system?: ts.System,
        createProgram?: ts.CreateProgram<T>,
        reportDiagnostic?: ts.DiagnosticReporter,
        reportSolutionBuilderStatus?: ts.DiagnosticReporter,
        reportErrorSummary?: ts.ReportEmitErrorSummary
    ): ts.SolutionBuilderHost<T> => {
        console.log('createSolutionBuilderHost +');
        const host = org_createSolutionBuilderHost(
            system,
            createProgram,
            reportDiagnostic,
            reportSolutionBuilderStatus,
            reportErrorSummary
        );

        apply(host);
        return host;
    };
    return tsm;

    function apply<T extends ts.BuilderProgram>(host: ts.SolutionBuilderHost<T>) {
        if (prepend) applyPrepend(host);
        if (outFileDir) {
            applyOutFileDir(host, outFileDir);
        }
        applyReadFile(host);
    }
}

export function applyReadFile(host: { readFile: (fileName: string) => string | undefined }): void {
    const orgReadFile = host.readFile;

    host.readFile = (fileName: string) => {
        if (fileName.endsWith('.ts') && !fileName.endsWith('.d.ts')) {
            //console.log('++ file:', fileName);
            const result = transform([fileName])[0];
            //console.log('-- file:', fileName, result);
            return result;
        }

        // if (fileName.endsWith('.json')) {
        //     console.log('CONFIG:', fileName);
        // }

        return orgReadFile(fileName);
    };
}

function applyPrepend<T extends ts.BuilderProgram>(host: ts.SolutionBuilderHost<T>) {
    const org_createProgram = host.createProgram;

    host.createProgram = (rootNames, options, host, oldProgram, configFileParsingDiagnostics, projectReferences) => {
        return org_createProgram(
            rootNames,
            options,
            host,
            oldProgram,
            configFileParsingDiagnostics,
            projectReferences?.map((pr) => ({ ...pr, prepend: true }))
        );
    };
}

function applyOutFileDir<T extends ts.BuilderProgram>(host: ts.SolutionBuilderHost<T>, outFileDir: string) {
    const org_createProgram = host.createProgram;

    host.createProgram = (rootNames, options, host, oldProgram, configFileParsingDiagnostics, projectReferences) => {
        if (options?.outFile) {
            const outFile = path.parse(options.outFile);
            options.outFile = `${outFileDir}/${outFile.base}`;
        }
        return org_createProgram(
            rootNames,
            options,
            host,
            oldProgram,
            configFileParsingDiagnostics,
            projectReferences?.map((pr) => ({ ...pr, prepend: true }))
        );
    };
}

function transform(files: string[], host?: ts.CompilerHost): string[] {
    const sourceFiles = createSourceFiles(files);
    const result: ts.TransformationResult<ts.SourceFile> = ts.transform<ts.SourceFile>(sourceFiles, [es3transformer]);

    const resultFiles: string[] = [];

    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    result.transformed.forEach((sf) => {
        const content = printer.printFile(sf);
        resultFiles.push(content);
    });

    return resultFiles;
}

function createSourceFiles(files: string[]) {
    return files.map((file) => {
        try {
            const source = fs.readFileSync(file).toString();
            return ts.createSourceFile(file, source, ts.ScriptTarget.ES5, true, ts.ScriptKind.TS);
        } catch (error) {
            console.log('createSourceFiles.error:', file);
            throw error;
        }
    });
}
