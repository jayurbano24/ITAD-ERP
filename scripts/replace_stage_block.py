from pathlib import Path

path = Path('src/app/dashboard/taller/components/TallerStageDashboard.tsx')
text = path.read_text()

start_marker = '            <div className="space-y-4">\n'
end_marker = '            </div>\n          </div>'

start = text.find(start_marker)
if start == -1:
	start_marker = '            <div className="space-y-4">\r\n'
	end_marker = '            </div>\r\n          </div>'
	start = text.find(start_marker)
	if start == -1:
		raise SystemExit('start marker not found')

end = text.find(end_marker, start)
if end == -1:
	raise SystemExit('end marker not found')

end += len('            </div>\n')

replacement = (
	'            <div className="space-y-4">\n'
	'              {isDiagnosticoStage && diagnosticoStageContent}\n'
	'              {isRepairStage && reparacionStageContent}\n'
	'              {isControlStage && controlStageContent}\n'
	'            </div>\n'
)

text = text[:start] + replacement + text[end:]
path.write_text(text)
