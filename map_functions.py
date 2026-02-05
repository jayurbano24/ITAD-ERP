file_path = r'c:\Users\Usuario01\ITAD-ERP-GUATEMALA\src\app\dashboard\logistica\components\LogisticaModule.tsx'
targets = ['handleAddItem', 'handleCaptureSerialEntry', 'DetailsView', 'renderManifestView', 'renderBoxesView', 'LogisticaModule']

with open(file_path, 'r', encoding='utf-8') as f:
    for i, line in enumerate(f):
        for target in targets:
            if f'const {target}' in line or f'function {target}' in line:
                print(f"L{i+1}: {line.strip()}")
