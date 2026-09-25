'use strict';

// The LUT tab: add, rename, lay out, preview and export the project's LUT PNGs. It renders inside the editor's React
// tree through shading.gui.addTab({component}) and reuses the editor's asset list.

const TEXT = {
    upload: ['Upload LUT', 'LUTを追加'],
    name: ['LUT name', 'LUT名'],
    fit: ['Fit preview', '全体表示'],
    actualSize: ['View at 100%', '100%で表示'],
    export: ['Export PNG', 'PNGを書き出す'],
    count: ['LUTs in image', '画像内のLUT数'],
    original: ['Original PNG preserved', '元のPNGを保持'],
    title: ['Add a color LUT', '色変換用のLUTを追加'],
    description: [
        'Import a PNG LUT without resizing it. Horizontal/vertical strips, tile atlases, ReShade MultiLUT ' +
            'and Hald CLUT are supported.',
        'PNGのLUTを原寸で読み込みます。横・縦ストリップ、タイル配置、ReShade MultiLUT、Hald CLUTに対応しています。'
    ],
    loading: ['Loading original PNG…', '元のPNGを読み込み中…'],
    layout: ['LUT image layout', 'LUT画像の配置'],
    format: ['Format', '形式'],
    auto: ['Auto detect / ReShade MultiLUT', '自動判別 / ReShade MultiLUT'],
    tiles: ['Custom tile atlas', 'タイル配置を指定'],
    hald: ['Hald CLUT', 'Hald CLUT'],
    cubeSize: ['RGB size', 'RGBサイズ'],
    columns: ['Slice columns', 'スライスの列数'],
    index: ['LUT number (from 1)', 'LUT番号（1から）'],
    flipGreen: ['Reverse green axis', '緑の軸を反転'],
    applyLayout: ['Apply to selected LUT', '選択中のLUTに適用'],
    layoutHelp: [
        'These settings also apply to new imports. Multiple LUTs are numbered left to right, then top to bottom. ' +
            'Choose Hald explicitly: square images can have different color ordering.',
        'この設定は新しい読み込みにも適用します。複数のLUTは左から右、上から下の順に数えます。' +
            '正方形の画像でも色の並び方が異なるため、Haldは明示的に選択してください。'
    ],
    help: [
        'Choose this LUT in the LUT block and set its mix from 0 to 100%. ' +
            'Preview scaling does not change the image used by the effect.',
        'LUTブロックでこの画像を選び、適用量を0〜100%で指定します。プレビューの表示倍率はエフェクトに使う画像には影響しません。'
    ]
};

const cls = name => `shading-plugin-lut-${name}`;

const createLUTTab = ({React, AssetPanel, fileUploadIcon, downloadBlob, manager, localize}) => {
    const h = React.createElement;

    class LUTTab extends React.Component {
        constructor (props) {
            super(props);
            this.state = {
                selected: null,
                name: '',
                error: null,
                busy: false,
                actualSize: false,
                mode: 'auto',
                size: 32,
                columns: 32,
                index: 1,
                flipGreen: false
            };
            this.handleLayoutChange = event => {
                const {name, value, checked, type} = event.target;
                this.setState({[name]: type === 'checkbox' ? checked : value});
            };
            this.handleApplyLayout = () => {
                try {
                    manager.configure(this.state.selected, this.layoutSettings());
                    this.setState({error: null});
                } catch (error) {
                    this.setState({error: error.message});
                }
            };
            this.handleChange = this.handleChange.bind(this);
            this.handleUpload = this.handleUpload.bind(this);
            this.handleOpenPicker = () => this.input && this.input.click();
            this.handleDelete = index => manager.remove(manager.items[index].id);
            this.handleExport = index => this.export(index);
            this.handleSelect = index => this.select(index);
            this.handleSetInput = input => {
                this.input = input;
            };
            this.handleRename = () => manager.rename(this.state.selected, this.state.name);
            this.handleNameChange = event => this.setState({name: event.target.value});
            this.handleSubmit = event => {
                event.preventDefault();
                this.handleRename();
            };
            this.handleToggleSize = () => this.setState(state => ({actualSize: !state.actualSize}));
            this.handleExportSelected = () => this.export(manager.items.findIndex(
                item => item.id === this.state.selected
            ));
        }

        componentDidMount () {
            this.mounted = true;
            manager.on('changed', this.handleChange);
            this.handleChange();
        }

        componentWillUnmount () {
            this.mounted = false;
            manager.off('changed', this.handleChange);
        }

        text (key) {
            return localize(this.props.locale, TEXT[key][0], TEXT[key][1]);
        }

        handleChange () {
            if (!this.mounted) return;
            const selected = manager.find(this.state.selected) || manager.items[0];
            if (selected && selected.id !== this.state.selected) this.select(manager.items.indexOf(selected));
            else this.setState({selected: selected ? selected.id : null, name: selected ? selected.name : ''});
        }

        layoutSettings () {
            return {
                mode: this.state.mode,
                size: Number(this.state.size),
                columns: Number(this.state.columns),
                index: Number(this.state.index) - 1,
                flipGreen: this.state.flipGreen
            };
        }

        select (index) {
            const item = manager.items[index];
            if (item) {
                this.setState({
                    selected: item.id,
                    name: item.name,
                    error: null,
                    mode: item.mode || 'auto',
                    size: item.size,
                    columns: item.columns || item.size,
                    index: (item.index || 0) + 1,
                    flipGreen: item.flipGreen || false
                });
            }
        }

        async handleUpload (event) {
            const files = Array.from(event.target.files || []);
            event.target.value = '';
            if (!files.length || this.state.busy) return;
            this.setState({busy: true, error: null});
            try {
                for (const file of files) {
                    const item = await manager.importFile(file, this.layoutSettings());
                    if (this.mounted) this.select(manager.items.indexOf(item));
                }
            } catch (error) {
                if (this.mounted) this.setState({error: error.message});
            } finally {
                if (this.mounted) this.setState({busy: false});
            }
        }

        export (index) {
            const item = manager.items[index];
            if (!item) return;
            const bytes = Uint8Array.from(atob(item.data.slice(22)), character => character.charCodeAt(0));
            downloadBlob(`${item.name}.png`, new Blob([bytes], {type: 'image/png'}));
        }

        renderSelected (selected) {
            return h(React.Fragment, null,
                h('form', {className: cls('toolbar'), onSubmit: this.handleSubmit},
                    h('label', {className: cls('name-label')},
                        this.text('name'),
                        h('input', {
                            maxLength: 64,
                            value: this.state.name,
                            onBlur: this.handleRename,
                            onChange: this.handleNameChange
                        })
                    ),
                    h('div', {className: cls('toolbar-actions')},
                        h('button', {
                            'aria-pressed': this.state.actualSize,
                            'type': 'button',
                            'onClick': this.handleToggleSize
                        }, this.state.actualSize ? this.text('fit') : this.text('actualSize')),
                        h('button', {type: 'button', onClick: this.handleExportSelected}, this.text('export'))
                    )
                ),
                h('div', {
                    'aria-label': selected.name,
                    'className': cls('preview'),
                    'role': 'region',
                    'tabIndex': 0
                }, h('img', {
                    alt: selected.name,
                    className: this.state.actualSize ? cls('actual-size') : cls('fit'),
                    height: selected.height,
                    src: selected.data,
                    width: selected.width
                })),
                h('div', {className: cls('metadata')},
                    h('strong', null, `${selected.width} × ${selected.height} px`),
                    h('span', null, `${selected.size} × ${selected.size} × ${selected.size} RGB`),
                    h('span', null, `${this.text('count')}: ${selected.count || 1}`),
                    h('span', null, this.text('original'))
                )
            );
        }

        renderEmpty () {
            return h('div', {className: cls('empty')},
                h('h2', null, this.text('title')),
                h('p', null, this.text('description')),
                h('button', {
                    className: cls('primary-button'),
                    disabled: this.state.busy,
                    type: 'button',
                    onClick: this.handleOpenPicker
                }, this.text('upload'))
            );
        }

        renderLayout (selected) {
            const numberInput = (name, label, extra) => h('label', null, label, h('input', Object.assign({
                min: 1,
                name,
                step: 1,
                type: 'number',
                value: this.state[name],
                onChange: this.handleLayoutChange
            }, extra)));
            return h('fieldset', {className: cls('layout-controls'), disabled: this.state.busy},
                h('legend', null, this.text('layout')),
                h('div', {className: cls('layout-fields')},
                    h('label', null, this.text('format'),
                        h('select', {name: 'mode', value: this.state.mode, onChange: this.handleLayoutChange},
                            h('option', {value: 'auto'}, this.text('auto')),
                            h('option', {value: 'tiles'}, this.text('tiles')),
                            h('option', {value: 'hald'}, this.text('hald'))
                        )
                    ),
                    this.state.mode === 'tiles' ? h(React.Fragment, null,
                        numberInput('size', this.text('cubeSize'), {min: 2, max: 256}),
                        numberInput('columns', this.text('columns'), {max: 256})
                    ) : null,
                    numberInput('index', this.text('index')),
                    h('label', {className: cls('checkbox-label')},
                        h('input', {
                            checked: this.state.flipGreen,
                            name: 'flipGreen',
                            type: 'checkbox',
                            onChange: this.handleLayoutChange
                        }),
                        this.text('flipGreen')
                    ),
                    selected ? h('button', {
                        className: cls('primary-button'),
                        type: 'button',
                        onClick: this.handleApplyLayout
                    }, this.text('applyLayout')) : null
                ),
                h('p', null, this.text('layoutHelp'))
            );
        }

        render () {
            const items = manager.items;
            const selected = items.find(item => item.id === this.state.selected);
            return h(AssetPanel, {
                buttons: [{title: this.text('upload'), img: fileUploadIcon, onClick: this.handleOpenPicker}],
                items: items.map(item => ({
                    id: item.id,
                    name: item.name,
                    details: `${item.width} × ${item.height}`,
                    thumbnail: h('img', {alt: '', className: cls('thumbnail'), src: item.data})
                })),
                selectedItemIndex: Math.max(0, items.indexOf(selected)),
                onDeleteClick: this.handleDelete,
                onExportClick: this.handleExport,
                onItemClick: this.handleSelect
            },
            h('input', {
                accept: '.png,image/png',
                className: cls('file-input'),
                disabled: this.state.busy,
                multiple: true,
                ref: this.handleSetInput,
                type: 'file',
                onChange: this.handleUpload
            }),
            h('section', {'aria-label': 'LUT', 'className': cls('editor')},
                selected ? this.renderSelected(selected) : this.renderEmpty(),
                this.state.busy ? h('p', {className: cls('status'), role: 'status'}, this.text('loading')) : null,
                this.state.error ? h('p', {className: cls('error'), role: 'alert'}, this.state.error) : null,
                this.renderLayout(selected),
                selected ? h('p', {className: cls('help')}, this.text('help')) : null
            ));
        }
    }

    return LUTTab;
};

module.exports = {createLUTTab};
