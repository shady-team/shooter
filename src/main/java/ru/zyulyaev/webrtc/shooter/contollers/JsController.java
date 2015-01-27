package ru.zyulyaev.webrtc.shooter.contollers;

import com.google.javascript.jscomp.*;
import com.google.javascript.jscomp.Compiler;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.ResponseBody;

import javax.servlet.ServletContext;
import java.io.IOException;
import java.nio.file.DirectoryStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;

/**
 * Created by nikita on 27.01.15.
 */
@Controller
public class JsController {
    @Autowired
    private ServletContext context;

    @RequestMapping(value = "/js/script.min.js", method = RequestMethod.GET, produces = "application/javascript")
    @ResponseBody
    @Cacheable("script.min.js")
    public String minifiedJs() throws IOException {
        return compile(CompilationLevel.ADVANCED_OPTIMIZATIONS);
    }

    @RequestMapping(value = "/js/script.js", method = RequestMethod.GET, produces = "application/javascript")
    @ResponseBody
    @Cacheable("script.js")
    public String nonMinifiedJs() throws IOException {
        return compile(CompilationLevel.WHITESPACE_ONLY);
    }

    private String compile(CompilationLevel compilationLevel) throws IOException {
        CompilerOptions options = new CompilerOptions();
        compilationLevel.setOptionsForCompilationLevel(options);
        compilationLevel.setTypeBasedOptimizationOptions(options);
        WarningLevel.VERBOSE.setOptionsForWarningLevel(options);
        options.setOutputCharset("utf-8");
        options.setLanguageIn(CompilerOptions.LanguageMode.ECMASCRIPT5);
        options.setDependencyOptions(new DependencyOptions().setDependencySorting(true));

        Path sourcesPath = Paths.get(context.getRealPath("/js/src"));
        DirectoryStream<Path> paths = Files.newDirectoryStream(sourcesPath, "*.js");
        List<SourceFile> sources = StreamSupport.stream(paths.spliterator(), false)
                .map(p -> SourceFile.fromFile(p.toFile()))
                .collect(Collectors.toList());
        List<SourceFile> externs = CommandLineRunner.getDefaultExterns();
        Path externsPath = Paths.get(context.getRealPath("/js/externs.js"));
        externs.add(SourceFile.fromFile(externsPath.toFile()));

        Compiler compiler = new Compiler();
        compiler.compile(externs, sources, options);

        if (compiler.hasErrors())
            throw new RuntimeException("Js compilation failed");

        return compiler.toSource();
    }
}
