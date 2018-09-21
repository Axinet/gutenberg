/**
 * Internal dependencies
 */
import {
	newPost,
	insertBlock,
	getEditedPostContent,
	setCodeEditorContent,
	switchToEditor,
	getAllBlocks,
	selectBlockByClientId,
} from '../support/utils';
import { activatePlugin, deactivatePlugin } from '../support/plugins';

describe( 'Align Hook Works As Expected', () => {
	beforeAll( async () => {
		await activatePlugin( 'gutenberg-test-align-hook' );
	} );

	beforeEach( async () => {
		await newPost();
	} );

	afterAll( async () => {
		await deactivatePlugin( 'gutenberg-test-align-hook' );
	} );

	const getAlignmentToolbarLabels = async () => {
		const buttonLabels = await page.evaluate( () => {
			const buttons = [];
			document.querySelectorAll(
				'.editor-block-toolbar button[aria-label^="Align"]'
			).forEach(
				( button ) => {
					buttons.push( button.getAttribute( 'aria-label' ) );
				}
			);
			return buttons;
		} );
		return buttonLabels;
	};

	const showsTheExpectedButtons = ( blockName, buttonLabels ) => {
		it( 'Shows the expected buttons on the alignment toolbar', async () => {
			await insertBlock( blockName );
			expect( await getAlignmentToolbarLabels() ).toEqual( buttonLabels );
		} );
	};

	const doesNotApplyAlignmentByDefault = ( blockName ) => {
		it( 'Does not apply any alignment by default', async () => {
			await insertBlock( blockName );
			// verify no alignment button is in pressed state
			const pressedButtons = await page.$$( '.editor-block-toolbar button[aria-label^="Align"][aria-pressed="true"]' );
			expect( pressedButtons ).toHaveLength( 0 );
		} );
	};

	const verifyMarkupIsValid = async ( htmlMarkup ) => {
		await switchToEditor( 'Code' );
		await setCodeEditorContent( '' );
		await switchToEditor( 'Visual' );
		await switchToEditor( 'Code' );
		await setCodeEditorContent( htmlMarkup );
		await switchToEditor( 'Visual' );
		const blocks = await getAllBlocks();
		expect( blocks ).toHaveLength( 1 );
		expect( blocks[ 0 ].isValid ).toBeTruthy();
	};

	const correctlyAppliesAndRemovesAlignment = ( blockName, alignment ) => {
		it( 'Correctly applies the selected alignment and correctly removes the alignment', async () => {
			const BUTTON_SELECTOR = `.editor-block-toolbar button[aria-label="Align ${ alignment }"]`;
			const BUTTON_PRESSED_SELECTOR = `${ BUTTON_SELECTOR }[aria-pressed="true"]`;
			// set the specified alignment.
			await insertBlock( blockName );
			await page.click( BUTTON_SELECTOR );

			// verify the button of the specified alignment is pressed.
			let pressedButtons = await page.$$( BUTTON_PRESSED_SELECTOR );
			expect( pressedButtons ).toHaveLength( 1 );

			let htmlMarkup = await getEditedPostContent();

			// verify the markup of the selected alignment was generated.
			expect( htmlMarkup ).toMatchSnapshot();

			// verify the markup can be correctly parsed
			await verifyMarkupIsValid( htmlMarkup );

			await selectBlockByClientId( ( await getAllBlocks() )[ 0 ].clientId );

			// remove the alignment.
			await page.click( BUTTON_SELECTOR );

			// verify no alignment button is in pressed state.
			pressedButtons = await page.$$( BUTTON_PRESSED_SELECTOR );
			expect( pressedButtons ).toHaveLength( 0 );

			// verify alignment markup was removed from the block.
			htmlMarkup = await getEditedPostContent();
			expect( htmlMarkup ).toMatchSnapshot();

			// verify the markup when no alignment is set is valid
			await verifyMarkupIsValid( htmlMarkup );

			await selectBlockByClientId( ( await getAllBlocks() )[ 0 ].clientId );

			// verify no alignment button is in pressed state after parsing the block.
			pressedButtons = await page.$$( BUTTON_PRESSED_SELECTOR );
			expect( pressedButtons ).toHaveLength( 0 );
		} );
	};

	describe( 'Block with no alignment set', () => {
		const BLOCK_NAME = 'Test No Alignment Set';
		it( 'Shows no alignment buttons on the alignment toolbar', async () => {
			expect( await getAlignmentToolbarLabels() ).toHaveLength( 0 );
		} );

		it( 'Does not save any alignment related attribute or class', async () => {
			await insertBlock( BLOCK_NAME );
			expect( await getEditedPostContent() ).toMatchSnapshot();
		} );
	} );

	describe( 'Block with align true', () => {
		const BLOCK_NAME = 'Test Align True';

		showsTheExpectedButtons( BLOCK_NAME, [
			'Align left',
			'Align center',
			'Align right',
		] );

		doesNotApplyAlignmentByDefault( BLOCK_NAME );

		correctlyAppliesAndRemovesAlignment( BLOCK_NAME, 'right' );
	} );

	describe( 'Block with align array', () => {
		const BLOCK_NAME = 'Test Align Array';

		showsTheExpectedButtons( BLOCK_NAME, [
			'Align left',
			'Align center',
		] );

		doesNotApplyAlignmentByDefault( BLOCK_NAME );

		correctlyAppliesAndRemovesAlignment( BLOCK_NAME, 'center' );
	} );

	describe( 'Block with default align', () => {
		const BLOCK_NAME = 'Test Default Align';
		const PRESSED_BUTTON_SELECTOR = '.editor-block-toolbar button[aria-label="Align right"][aria-pressed="true"]';
		showsTheExpectedButtons( BLOCK_NAME, [
			'Align left',
			'Align center',
			'Align right',
		] );

		it( 'Applies the selected alignment by default', async () => {
			await insertBlock( BLOCK_NAME );
			// verify the correct alignment button is pressed
			const pressedButtons = await page.$$( PRESSED_BUTTON_SELECTOR );
			expect( pressedButtons ).toHaveLength( 1 );
		} );

		it( 'The default markup does not contain the alignment attribute but contains the alignment class', async () => {
			await insertBlock( BLOCK_NAME );
			const markup = await getEditedPostContent();
			expect( markup ).not.toContain( '"align":"right"' );
			expect( markup ).toContain( 'alignright' );
		} );

		it( 'Can remove the default alignment and the align attribute equals none but alignnone class is not applied', async () => {
			await insertBlock( BLOCK_NAME );
			// remove the alignment.
			await page.click( PRESSED_BUTTON_SELECTOR );
			const markup = await getEditedPostContent();
			expect( markup ).toContain( '"align":null' );
			expect( markup ).not.toContain( 'alignnull' );
		} );

		correctlyAppliesAndRemovesAlignment( BLOCK_NAME, 'center' );
	} );
} );
