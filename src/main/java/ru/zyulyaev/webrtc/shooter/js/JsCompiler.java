package ru.zyulyaev.webrtc.shooter.js;

import org.apache.commons.logging.Log;
import org.apache.commons.logging.LogFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.servlet.ServletContext;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

/**
 * Created by nikita on 29.01.15.
 */
@Component
public class JsCompiler {
    private static final Log LOG = LogFactory.getLog(JsCompiler.class);
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    @Autowired
    private ServletContext context;

    @PostConstruct
    public void start() {
        Path sourceDir = Paths.get(context.getRealPath("/js/src/"));
        Path outputDir = Paths.get(context.getRealPath("/js/"));
        CompilingWatcher watcher = new CompilingWatcher(sourceDir, outputDir, "script");
        executor.submit(watcher);
    }

    @PreDestroy
    public void stop() {
        executor.shutdown();
        try {
            if(!executor.awaitTermination(5, TimeUnit.SECONDS)) {
                LOG.warn("Termination did not finish in 5 seconds");
            }
        } catch (InterruptedException e) {
            LOG.warn("Termination awaiting interrupted");
        }
    }
}
