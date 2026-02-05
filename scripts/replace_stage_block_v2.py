from pathlib import Path

path = Path('src/app/dashboard/taller/components/TallerStageDashboard.tsx')
text = path.read_text()
start_marker = '            <div className="space-y-4">\n              {isDiagnosticoStage ? ('
start_idx = text.index(start_marker)
end_idx = text.index('\n            </div>\n          </div>\n        </div>\n      </div>\n    </div>\n  )\n}', start_idx)
replacement = '            <div className="space-y-4">\n              {renderStageContent()}\n            </div>'
new_text = text[:start_idx] + replacement + text[end_idx:]
path.write_text(new_text)
