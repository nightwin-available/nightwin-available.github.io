native.define("GetCursorPos", "user32.dll", "GetCursorPos", "int", "ptr");
native.define("GetAsyncKeyState", "user32.dll", "GetAsyncKeyState", "int", "int");

var pointBuffer = native.alloc(8);
var menuX = null; var menuY = null;
var menuW = 420;  var menuH = 340;
var isDragging = false; var offsetX = 0; var offsetY = 0;
var wasClicking = false; var mouseX = 0; var mouseY = 0;
var isClicking = false; var freshClick = false;

var menuVisible = true;
var wasHomePressed = false;
var activeTab = 0;
var currentY = 0; var itemX = 0; var itemW = 0;
var pickerCache = {};

function hsvToRgb(h, s, v) {
    var r, g, b;
    var i = Math.floor(h * 6); var f = h * 6 - i;
    var p = v * (1 - s); var q = v * (1 - f * s); var t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [Math.floor(r * 255), Math.floor(g * 255), Math.floor(b * 255)];
}

function drawMenuGradient(x, y, w, h) {
    var steps = 24; var stepW = w / steps;
    for (var i = 0; i < steps; i++) {
        var t = i / steps;
        var r = Math.floor(cfg.color1R + (cfg.color2R - cfg.color1R) * t);
        var g = Math.floor(cfg.color1G + (cfg.color2G - cfg.color1G) * t);
        var b = Math.floor(cfg.color1B + (cfg.color2B - cfg.color1B) * t);
        draw_filled_rect(x + i * stepW, y, stepW + 1, h, r, g, b, 255);
    }
}

function drawCustomCursor(x, y) {
    draw_line(x, y, x, y + 16, 12, 12, 12, 255, 1);
    draw_line(x, y, x + 11, y + 11, 12, 12, 12, 255, 1);
    draw_line(x, y + 16, x + 4, y + 12, 12, 12, 12, 255, 1);
    draw_line(x + 11, y + 11, x + 4, y + 12, 12, 12, 12, 255, 1);
    for (var i = 1; i <= 14; i++) {
        var endX = (i <= 10) ? i : (14 - (i - 11) * 3);
        if (endX < 1) endX = 1;
        draw_line(x + 1, y + i, x + endX, y + i, 250, 250, 250, 255, 1);
    }
}

var Gui = {
    activePicker: null,
    updateInput: function() {
        if (!pointBuffer) return false;
        if (native.call("GetCursorPos", pointBuffer)) {
            mouseX = native.readInt(pointBuffer, 0);
            mouseY = native.readInt(pointBuffer, 4);
            isClicking = (native.call("GetAsyncKeyState", 1) & 0x8000) !== 0;
            freshClick = isClicking && !wasClicking;
            wasClicking = isClicking;
            return true;
        }
        return false;
    },
    isHovered: function(x, y, w, h) { return mouseX >= x && mouseX <= x + w && mouseY >= y && mouseY <= y + h; },
    begin: function(title) {
        if (menuX === null || menuY === null) {
            var center = get_screen_center();
            menuX = center.x - menuW / 2; menuY = center.y - menuH / 2;
        }
        if (isClicking) {
            if (!isDragging && Gui.isHovered(menuX, menuY, menuW, 25)) {
                isDragging = true; offsetX = mouseX - menuX; offsetY = mouseY - menuY;
            }
            if (isDragging) { menuX = mouseX - offsetX; menuY = mouseY - offsetY; }
        } else { isDragging = false; }
        draw_filled_rect(menuX, menuY, menuW, menuH, 20, 20, 25, 245);
        draw_rect(menuX, menuY, menuW, menuH, 45, 45, 55, 255, 1);
        drawMenuGradient(menuX + 1, menuY + 1, menuW - 2, 4);
        draw_filled_rect(menuX + 1, menuY + 5, menuW - 2, 25, 28, 28, 34, 255);
        draw_line(menuX + 1, menuY + 30, menuX + menuW - 1, menuY + 30, 45, 45, 55, 255, 1);
        draw_text(menuX + 12, menuY + 10, 235, 235, 240, 255, title);
        draw_filled_rect(menuX + 8, menuY + 38, 110, menuH - 46, 26, 26, 32, 255);
        draw_rect(menuX + 8, menuY + 38, 110, menuH - 46, 42, 42, 50, 255, 1);
        draw_filled_rect(menuX + 126, menuY + 38, menuW - 134, menuH - 46, 26, 26, 32, 255);
        draw_rect(menuX + 126, menuY + 38, menuW - 134, menuH - 46, 42, 42, 50, 255, 1);
        currentY = menuY + 44; itemX = menuX + 140; itemW = menuW - 162;
    },
    renderTabs: function(tabsArray) {
        var tabY = menuY + 46;
        for (var i = 0; i < tabsArray.length; i++) {
            var hovered = Gui.isHovered(menuX + 14, tabY, 98, 26);
            if (freshClick && hovered) activeTab = i;
            if (activeTab === i) {
                draw_filled_rect(menuX + 14, tabY, 98, 26, 45, 45, 60, 255);
                draw_rect(menuX + 14, tabY, 98, 26, cfg.color1R, cfg.color1G, cfg.color1B, 255, 1);
                draw_text(menuX + 24, tabY + 6, 255, 255, 255, 255, tabsArray[i]);
            } else {
                if (hovered) {
                    draw_filled_rect(menuX + 14, tabY, 98, 26, 35, 35, 42, 255);
                    draw_text(menuX + 24, tabY + 6, 200, 200, 205, 255, tabsArray[i]);
                } else { draw_text(menuX + 24, tabY + 6, 150, 150, 155, 255, tabsArray[i]); }
            }
            tabY += 32;
        }
    },
    checkbox: function(label, configObj, configKey) {
        var state = configObj[configKey]; var boxX = itemX; var boxY = currentY + 2; var boxSize = 14;
        var hovered = Gui.isHovered(itemX, currentY, itemW, 18);
        if (freshClick && hovered) { configObj[configKey] = !state; state = !state; }
        draw_filled_rect(boxX, boxY, boxSize, boxSize, 38, 38, 46, 255);
        draw_rect(boxX, boxY, boxSize, boxSize, 60, 60, 72, 255, 1);
        if (state) {
            draw_filled_rect(boxX + 3, boxY + 3, boxSize - 6, boxSize - 6, cfg.color1R, cfg.color1G, cfg.color1B, 255);
            draw_text(boxX + 22, currentY + 1, 240, 240, 245, 255, label);
        } else {
            if (hovered) draw_text(boxX + 22, currentY + 1, 200, 200, 205, 255, label);
            else draw_text(boxX + 22, currentY + 1, 160, 160, 165, 255, label);
        }
        currentY += 22;
    },
    slider: function(label, configObj, configKey, min, max) {
        var val = configObj[configKey]; var sliderX = itemX; var sliderY = currentY + 15; var sliderH = 6;
        draw_text(itemX, currentY, 160, 160, 165, 255, label);
        draw_text(itemX + itemW - 30, currentY, cfg.color2R, cfg.color2G, cfg.color2B, 255, "" + val);
        var hovered = Gui.isHovered(sliderX, sliderY - 2, itemW, sliderH + 4);
        if (isClicking && hovered) {
            var percent = (mouseX - sliderX) / itemW;
            if (percent < 0) percent = 0; if (percent > 1) percent = 1;
            configObj[configKey] = Math.floor(min + (max - min) * percent);
            val = configObj[configKey];
        }
        draw_filled_rect(sliderX, sliderY, itemW, sliderH, 38, 38, 46, 255);
        draw_rect(sliderX, sliderY, itemW, sliderH, 55, 55, 65, 255, 1);
        var fillW = Math.floor(((val - min) / (max - min)) * itemW);
        if (fillW > 0) draw_filled_rect(sliderX + 1, sliderY + 1, fillW - 2, sliderH - 2, cfg.color1R, cfg.color1G, cfg.color1B, 255);
        currentY += 32;
    },
    colorpicker: function(label, configObj, rKey, gKey, bKey) {
        var r = configObj[rKey]; var g = configObj[gKey]; var b = configObj[bKey];
        var cpW = 22; var cpH = 12; var cpX = itemX + itemW - cpW; var cpY = currentY + 2;
        draw_text(itemX, currentY, 160, 160, 165, 255, label);
        draw_filled_rect(cpX, cpY, cpW, cpH, r, g, b, 255);
        draw_rect(cpX, cpY, cpW, cpH, 65, 65, 75, 255, 1);
        if (!pickerCache[label]) pickerCache[label] = { h: 0.7, s: 1.0, v: 1.0 };
        var cache = pickerCache[label];
        if (freshClick && Gui.isHovered(cpX, cpY, cpW, cpH)) {
            Gui.activePicker = (Gui.activePicker === label) ? null : label;
        }
        currentY += 20;
        if (Gui.activePicker === label) {
            var matrixH = 70; var hueH = 10; var gap = 6; var totalH = matrixH + hueH + gap + 14;
            draw_filled_rect(itemX, currentY, itemW, totalH, 26, 26, 32, 255);
            draw_rect(itemX, currentY, itemW, totalH, 48, 48, 58, 255, 1);
            var mX = itemX + 7; var mY = currentY + 7; var mW = itemW - 14;
            if (isClicking && Gui.isHovered(mX, mY, mW, matrixH)) {
                var pctX = (mouseX - mX) / mW; var pctY = 1.0 - ((mouseY - mY) / matrixH);
                if (pctX < 0) pctX = 0; if (pctX > 1) pctX = 1;
                if (pctY < 0) pctY = 0; if (pctY > 1) pctY = 1;
                cache.s = pctX; cache.v = pctY;
                var outRgb = hsvToRgb(cache.h, cache.s, cache.v);
                configObj[rKey] = outRgb[0]; configObj[gKey] = outRgb[1]; configObj[bKey] = outRgb[2];
            }
            var cols = 20; var rows = 10; var cellW = mW / cols; var cellH = matrixH / rows;
            for (var row = 0; row < rows; row++) {
                var curV = 1.0 - (row / (rows - 1));
                for (var col = 0; col < cols; col++) {
                    var curS = col / (cols - 1); var cellRgb = hsvToRgb(cache.h, curS, curV);
                    draw_filled_rect(mX + col * cellW, mY + row * cellH, cellW + 1, cellH + 1, cellRgb[0], cellRgb[1], cellRgb[2], 255);
                }
            }
            draw_rect(mX + (cache.s * mW) - 2, mY + ((1.0 - cache.v) * matrixH) - 2, 4, 4, 255, 255, 255, 255, 1);
            var hBarY = mY + matrixH + gap;
            if (isClicking && Gui.isHovered(mX, hBarY, mW, hueH)) {
                var pctH = (mouseX - mX) / mW;
                if (pctH < 0) pctH = 0; if (pctH > 1) pctH = 1;
                cache.h = pctH;
                var outRgb = hsvToRgb(cache.h, cache.s, cache.v);
                configObj[rKey] = outRgb[0]; configObj[gKey] = outRgb[1]; configObj[bKey] = outRgb[2];
            }
            var hueSteps = 30; var hStepW = mW / hueSteps;
            for (var i = 0; i < hueSteps; i++) {
                var hueRgb = hsvToRgb(i / hueSteps, 1.0, 1.0);
                draw_filled_rect(mX + i * hStepW, hBarY, hStepW + 1, hueH, hueRgb[0], hueRgb[1], hueRgb[2], 255);
            }
            var hCursorX = mX + (cache.h * mW);
            draw_line(hCursorX, hBarY - 1, hCursorX, hBarY + hueH + 1, 255, 255, 255, 255, 1);
            currentY += totalH + 6;
        }
    },
    button: function(label, callback) {
        var btnH = 24; var hovered = Gui.isHovered(itemX, currentY, itemW, btnH);
        if (hovered) {
            draw_filled_rect(itemX, currentY, itemW, btnH, 50, 50, 65, 255);
            draw_rect(itemX, currentY, itemW, btnH, cfg.color1R, cfg.color1G, cfg.color1B, 255, 1);
            if (freshClick) callback();
        } else {
            draw_filled_rect(itemX, currentY, itemW, btnH, 38, 38, 46, 255);
            draw_rect(itemX, currentY, itemW, btnH, 55, 55, 68, 255, 1);
        }
        draw_text(itemX + 14, currentY + 5, 230, 230, 235, 255, label);
        currentY += 30;
    },
    end: function() {}
};
