package ru.zyulyaev.webrtc.shooter.js;

import com.google.javascript.jscomp.*;
import com.google.javascript.jscomp.Compiler;
import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;

import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * Created by nikita on 29.01.15.
 */
class CompilingWatcher implements Runnable {
    private static final Log LOG = LogFactory.getLog(CompilingWatcher.class);

    private final Path sourceDir;
    private final Path outputDir;
    private final String scriptName;

    CompilingWatcher(Path sourceDir, Path outputDir, String scriptName) {
        this.sourceDir = sourceDir;
        this.outputDir = outputDir;
        this.scriptName = scriptName;
    }

    @Override
    public void run() {
        try {
            recompile();
            WatchService watchService = sourceDir.getFileSystem().newWatchService();
            sourceDir.register(watchService, StandardWatchEventKinds.ENTRY_CREATE, StandardWatchEventKinds.ENTRY_MODIFY, StandardWatchEventKinds.ENTRY_DELETE);
            while (!Thread.interrupted()) {
                WatchKey key = watchService.take();
                recompile();
                key.pollEvents();
                key.reset();
            }
        } catch (InterruptedException e) {
            // done
        } catch (IOException e) {
            LOG.error("Couldn't create WatchService");
        }
    }

    private String compile(boolean debug) throws IOException {
        CompilerOptions options = new CompilerOptions();
        options.setDefineToBooleanLiteral("DEBUG", debug);
        if (debug) {
            CompilationLevel.WHITESPACE_ONLY.setOptionsForCompilationLevel(options);
        } else {
            CompilationLevel.ADVANCED_OPTIMIZATIONS.setOptionsForCompilationLevel(options);
            CompilationLevel.ADVANCED_OPTIMIZATIONS.setTypeBasedOptimizationOptions(options);
        }
        WarningLevel.VERBOSE.setOptionsForWarningLevel(options);
        options.setOutputCharset("utf-8");
        options.setLanguageIn(CompilerOptions.LanguageMode.ECMASCRIPT5);
        options.setDependencyOptions(new DependencyOptions().setDependencySorting(true));

        DirectoryStream<Path> paths = Files.newDirectoryStream(sourceDir, "*.js");
        List<SourceFile> sources = StreamSupport.stream(paths.spliterator(), false)
                .map(p -> SourceFile.fromFile(p.toFile()))
                .collect(Collectors.toList());
        List<SourceFile> externs = CommandLineRunner.getDefaultExterns();
        Path externsPath = outputDir.resolve("externs.js");
        externs.add(SourceFile.fromFile(externsPath.toFile()));

        Compiler compiler = new Compiler();
        compiler.compile(externs, sources, options);

        if (compiler.hasErrors())
            throw new RuntimeException("Js compilation failed");

        return compiler.toSource();
    }

    private void writeJs(String filename, String code) throws IOException {
        Files.write(
                outputDir.resolve(filename),
                code.getBytes(),
                StandardOpenOption.CREATE,
                StandardOpenOption.TRUNCATE_EXISTING,
                StandardOpenOption.WRITE
        );
    }

    private void recompile() throws IOException {
        writeJs(scriptName + ".min.js", compile(false));
        writeJs(scriptName + ".js", compile(true));
    }
}
