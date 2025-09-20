console.log('🔄 Starting to load card-generator-js.js file...');

/**
 * Unified Card Generator
 * Handles card creation from multiple data sources (form input, imported data, database items)
 */
class CardGenerator {
 
/**
 * Main card creation function
 * @param {Object} options - Configuration options
 * @param {Object} options.data - Pre-existing card data object
 * @param {boolean} options.formData - Extract data from form inputs
 * @param {boolean} options.isPreview - Whether this is a preview card
 * @param {HTMLElement} options.container - Container to append card to
 * @param {boolean} options.includeControls - Whether to include control buttons
 * @param {string} options.mode - 'generator' | 'browser' | 'preview'
 * @param {boolean} options.skipValidation - Skip validation (for galleries)
 * @returns {Promise<HTMLElement|null>} The created card element
 */
static async createCard(options = {}) {
  const callId = Math.random().toString(36).substr(2, 9);
  // console.log(`🎯 CardGenerator.createCard called with options:`, options, `[Call ID: ${callId}]`);
  
  const {
    data = null,
    formData = false,
    isPreview = false,
    container = null,
    includeControls = true,
    mode = 'generator',
    skipValidation = false
  } = options;

  try {
    // console.log('📊 Starting card creation process...');
    
    // Determine data source and extract card data
    let cardData;
    if (data) {
      // console.log('📋 Using provided data');
      cardData = this.normalizeCardData(data);
    } else if (formData) {
      // console.log('📝 Extracting data from form...');
      cardData = await this.extractFormData(); // ← Now properly awaiting the Promise
      // console.log('✅ Form data extracted:', cardData);
      // console.log(`🔍 CardData scalingValues check:`, JSON.stringify(cardData.scalingValues, null, 2), `[Call ID: ${callId}]`);
    } else {
      throw new Error('No data source provided');
    }

    // Check dependencies before validation
    if (typeof Validation === 'undefined') {
      console.error('❌ Validation class not available');
      throw new Error('Validation class not loaded');
    }

    // console.log('🏗️ Building card element...');
    // console.log(`🔍 cardData.scalingValues before buildCardElement:`, JSON.stringify(cardData.scalingValues, null, 2), `[Call ID: ${callId}]`);
    // Create a deep clone of cardData to prevent reference issues
    const clonedCardData = JSON.parse(JSON.stringify(cardData));
    console.log(`🔍 clonedCardData.scalingValues:`, JSON.stringify(clonedCardData.scalingValues, null, 2), `[Call ID: ${callId}]`);
    
    // Skip validation if requested (for galleries)
    if (!skipValidation) {
      // console.log('🔍 Validating card data...');
      // Validate card data
      const validation = Validation.validateCardData(clonedCardData);
      if (!validation.valid) {
        console.error('❌ Validation failed:', validation.error);
        if (mode === 'generator' || mode === 'preview') {
          if (typeof Messages !== 'undefined') {
            Messages.showError(validation.error);
          } else {
            console.error('❌ Messages class not available, showing alert instead');
            alert('Validation Error: ' + validation.error);
          }
        }
        return null;
      }
      // console.log('✅ Validation passed');
    } else {
      // console.log('⏭️ Skipping validation (skipValidation: true)');
    }
    
    // Create the card element
    const cardElement = this.buildCardElement(clonedCardData, mode, includeControls, callId);

    // Add to container if specified
    if (container) {
      // console.log('📦 Adding card to container');
      if (isPreview) {
        container.innerHTML = '';
      }
      container.appendChild(cardElement);
    }

    // Store card data for export if in generator mode
    if (mode === 'generator' && !isPreview && window.cardsData) {
      // console.log('💾 Storing card data for export');
      window.cardsData.push(cardData);
    }

    // Apply sizing and positioning after DOM insertion
    this.applyCardSizing(cardElement, cardData);

    console.log(`✅ Card created successfully [Call ID: ${callId}]`);
    return cardElement;

  } catch (error) {
    console.error('❌ Error creating card:', error);
    if (mode === 'generator') {
      if (typeof Messages !== 'undefined') {
        Messages.showError('Error creating card: ' + error.message);
      } else {
        console.error('❌ Messages class not available for error display');
        alert('Error creating card: ' + error.message);
      }
    }
    return null;
  }
}

  /**
   * Extract card data from form inputs
   */
  static extractFormData() {
    // console.log('📝 Extracting form data...');
    
    const imageInput = document.getElementById("imageInput");
    
    // Check for required image
    if (!imageInput?.files?.[0]) {
      console.error('❌ No image file found');
      throw new Error("Please upload an image first.");
    }
    console.log('🖼️ Image file found:', imageInput.files[0].name);

    // Get form values
    const itemName = document.getElementById("itemNameInput")?.value || '';
    const hero = document.getElementById("heroSelect")?.value || 'Neutral';
    const cooldown = document.getElementById("cooldownInput")?.value || '';
    const ammo = document.getElementById("ammoInput")?.value || '';
    const crit = document.getElementById("critInput")?.value || '';
    const multicast = document.getElementById("multicastInput")?.value || '';
    const itemSize = document.getElementById("itemSizeSelect")?.value || 'Medium';
    const border = document.getElementById("borderSelect")?.value || 'gold';
    
    // Handle custom hero image
    let customHeroImage = null;
    if (hero === 'Custom') {
      const customHeroInput = document.getElementById("customHeroInput");
      if (customHeroInput?.files?.[0]) {
        customHeroImage = new Promise(async (resolve) => {
          try {
            // Try to upload to storage first
            if (typeof ImageStorage !== 'undefined' && ImageStorage.uploadImage) {
              const imageUrl = await ImageStorage.uploadImage(
                customHeroInput.files[0], 
                itemName + '-hero', 
                'hero'
              );
              resolve(imageUrl);
            } else {
              // Fallback to base64
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target.result);
              reader.readAsDataURL(customHeroInput.files[0]);
            }
          } catch (error) {
            console.warn('⚠️ Failed to upload custom hero image, falling back to base64:', error);
            // Fallback to base64
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(customHeroInput.files[0]);
          }
        });
      }
    }

    // console.log('📋 Basic form values extracted:', {
    //   itemName, hero, cooldown, ammo, crit, multicast, itemSize, border
    // });

    // Get scaling values
    const scalingValues = {
      heal: document.getElementById("healScalingInput")?.value || '',
      regen: document.getElementById("regenScalingInput")?.value || '',
      shield: document.getElementById("shieldScalingInput")?.value || '',
      damage: document.getElementById("damageScalingInput")?.value || '',
      poison: document.getElementById("poisonScalingInput")?.value || '',
      burn: document.getElementById("burnScalingInput")?.value || ''
    };
    
    // console.log('📊 Scaling values extracted:', scalingValues);
    
    // Get custom scaling values
    const customScalingContainer = document.getElementById('customScalingContainer');
    // console.log('🎨 Custom scaling container found:', customScalingContainer);
    const customScalingInputs = customScalingContainer?.querySelectorAll('.custom-scaling-input') || [];
    // console.log('🎨 Custom scaling inputs found:', customScalingInputs.length);
    // console.log('🎨 Custom scaling input elements:', customScalingInputs);
    
    // Debug: Log the actual HTML content of the container
    // if (customScalingContainer) {
    //   console.log('🎨 Custom scaling container HTML:', customScalingContainer.innerHTML);
    // }
    
    // Also check for any custom scaling inputs anywhere in the document
    const allCustomScalingInputs = document.querySelectorAll('.custom-scaling-input');
    // console.log('🎨 All custom scaling inputs in document:', allCustomScalingInputs.length);
    
    const customScalingValues = Array.from(customScalingInputs).map((inputGroup, index) => {
      // console.log(`🎨 Processing custom scaling input group ${index}:`, inputGroup);
      const valueInput = inputGroup.querySelector('.custom-scaling-value');
      const colorInput = inputGroup.querySelector('.custom-scaling-color');
      const value = valueInput?.value?.trim() || '';
      const color = colorInput?.value || '#00ff00';
      // console.log(`🎨 Input group ${index} - value: "${value}", color: "${color}"`);
      
      if (value) {
        // Use advanced filter conversion for better color matching
        const filterString = this.hexToAdvancedFilters(color);
        const result = {
          value: value,
          color: color,
          filterString: filterString
        };
        console.log(`🎨 Input group ${index} - generated filter:`, filterString);
        return result;
      }
      // console.log(`🎨 Input group ${index} - no value, skipping`);
      return null;
    }).filter(val => val !== null);
    
    if (customScalingValues.length > 0) {
      scalingValues.custom = customScalingValues;
      console.log('🎨 Custom scaling values found:', customScalingValues.length, 'values');
    } else {
      // console.log('🎨 No custom scaling values found');
    }
    
    console.log('📊 Final scaling values extracted');

    // Get dynamic inputs - on-use effects, tags, passive effects, and quests
    const onUseInputs = document.querySelectorAll("#onUseInputs input");
    const tagInputs = document.querySelectorAll("#tagInputs input");
    const passiveInputs = document.querySelectorAll("#passiveInputs input");
    const questInputs = document.querySelectorAll("#questInputs .quest-input-group");

    console.log('🏷️ Dynamic inputs found:');
    console.log('  - Tag inputs:', tagInputs.length, 'values:', Array.from(tagInputs).map(i => i.value));
    console.log('  - OnUse inputs:', onUseInputs.length, 'values:', Array.from(onUseInputs).map(i => i.value));
    console.log('  - Passive inputs:', passiveInputs.length, 'values:', Array.from(passiveInputs).map(i => i.value));
    console.log('  - Quest inputs:', questInputs.length, 'groups');

    // Extract quest data
    const quests = Array.from(questInputs).map(questGroup => {
      const conditionInput = questGroup.querySelector('.quest-condition');
      const valueInput = questGroup.querySelector('.quest-value');
      const rewardInput = questGroup.querySelector('.quest-reward');
      const orCheckbox = questGroup.querySelector('input[type="checkbox"]');
      
      return {
        condition: conditionInput?.value?.trim() || '',
        value: valueInput?.value?.trim() || '1',
        reward: rewardInput?.value?.trim() || '',
        or: orCheckbox?.checked || false
      };
    }).filter(quest => quest.condition && quest.reward); // Only include quests with both condition and reward

    return new Promise(async (resolve) => {
      console.log('📖 Processing image file...');
      
      // Upload image to storage if ImageStorage is available
      let imageData = null;
      if (typeof ImageStorage !== 'undefined' && ImageStorage.uploadImage) {
        try {
          console.log('📤 Uploading image to storage...');
          imageData = await ImageStorage.uploadImage(
            imageInput.files[0], 
            itemName, 
            'card'
          );
          console.log('✅ Image uploaded to storage:', imageData);
        } catch (uploadError) {
          console.warn('⚠️ Failed to upload to storage, falling back to base64:', uploadError);
          // Fallback to base64
          imageData = await this.readImageFile(imageInput.files[0]);
        }
      } else {
        // Fallback to base64 if ImageStorage not available
        console.log('📤 ImageStorage not available, using base64...');
        imageData = await this.readImageFile(imageInput.files[0]);
      }
      
      // Handle custom hero image if present
      let resolvedCustomHeroImage = null;
      if (customHeroImage) {
        resolvedCustomHeroImage = await customHeroImage;
      }
      
      const extractedData = {
        itemName: itemName,
        hero: hero,
        cooldown: cooldown,
        ammo: ammo,
        crit: crit,
        multicast: multicast,
        itemSize: itemSize,
        border: border,
        passiveEffects: Array.from(passiveInputs).map(input => input.value.trim()).filter(val => val), // Now array
        onUseEffects: Array.from(onUseInputs).map(input => input.value.trim()).filter(val => val),
        tags: Array.from(tagInputs).map(input => input.value.trim().toUpperCase()).filter(val => val),
        quests: quests,
        scalingValues: scalingValues,
        imageData: imageData,
        customHeroImage: resolvedCustomHeroImage,
        timestamp: new Date().toISOString()
      };
      
      console.log('📦 Final extracted data:', extractedData);
      resolve(extractedData);
    });
  }

  /**
   * Read image file as data URL (fallback method)
   */
  static readImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Normalize card data from different sources (import, database, etc.)
   */
  static normalizeCardData(data) {
    console.log('🔄 Normalizing card data:', data);
    
    // Handle database format
    if (data.item_data) {
      const itemData = data.item_data;
      const normalized = {
        itemName: itemData.name || itemData.itemName || 'Unnamed Item',
        hero: itemData.hero || 'Neutral',
        cooldown: itemData.cooldown || '',
        ammo: itemData.ammo || '',
        crit: itemData.crit || '',
        multicast: itemData.multicast || '',
        itemSize: itemData.item_size || itemData.itemSize || 'Medium',
        border: itemData.rarity || itemData.border || 'gold',
        passiveEffects: itemData.passive_effects || itemData.passiveEffects || itemData.passive_effect ? [itemData.passive_effect] : [], // Handle both formats
        onUseEffects: itemData.on_use_effects || itemData.onUseEffects || [],
        tags: itemData.tags || [],
        quests: itemData.quests || [],
        scalingValues: itemData.scaling_values || itemData.scalingValues || {},
        imageData: itemData.image_data || itemData.imageData || '',
        customHeroImage: itemData.custom_hero_image || itemData.customHeroImage || null,
        timestamp: data.created_at || new Date().toISOString(),
        databaseId: data.id,
        createdBy: data.users?.alias || data.user_alias
      };

      // Preserve gallery-specific fields
      if (itemData.isGallery) {
        normalized.isGallery = true;
        normalized.galleryItems = itemData.galleryItems || [];
        normalized.galleryInfo = itemData.galleryInfo || {};
        console.log('🖼️ Preserved gallery data:', {
          isGallery: normalized.isGallery,
          galleryItemsCount: normalized.galleryItems.length,
          galleryInfo: normalized.galleryInfo
        });
      }

      return normalized;
    }

    // Already in correct format (import or generator format)
    // Handle backward compatibility for old single passiveEffect
    let passiveEffects = data.passiveEffects || [];
    if (data.passiveEffect && !passiveEffects.length) {
      passiveEffects = [data.passiveEffect];
    }

    const normalized = {
      itemName: data.itemName || '',
      hero: data.hero || 'Neutral',
      cooldown: data.cooldown || '',
      ammo: data.ammo || '',
      crit: data.crit || '',
      multicast: data.multicast || '',
      itemSize: data.itemSize || 'Medium',
      border: data.border || 'gold',
      passiveEffects: passiveEffects, // Now always an array
      onUseEffects: data.onUseEffects || [],
      tags: data.tags || [],
      quests: data.quests || [],
      scalingValues: data.scalingValues || {},
      imageData: data.imageData || '',
      timestamp: data.timestamp || new Date().toISOString(),
      databaseId: data.databaseId,
      createdBy: data.createdBy
    };

    // Preserve gallery-specific fields
    if (data.isGallery) {
      normalized.isGallery = true;
      normalized.galleryItems = data.galleryItems || [];
      normalized.galleryInfo = data.galleryInfo || {};
      console.log('🖼️ Preserved gallery data:', {
        isGallery: normalized.isGallery,
        galleryItemsCount: normalized.galleryItems.length,
        galleryInfo: normalized.galleryInfo
      });
    }

    return normalized;
  }

  /**
   * Build the complete card element
   */
  static buildCardElement(cardData, mode = 'generator', includeControls = true, callId = 'unknown') {
    // console.log(`🏗️ Building card element for mode: ${mode} [Call ID: ${callId}]`);
    // console.log(`🔍 cardData.scalingValues in buildCardElement:`, JSON.stringify(cardData.scalingValues, null, 2), `[Call ID: ${callId}]`);
    
    const borderColor = this.getBorderColor(cardData.border);
    const card = document.createElement("div");
    card.className = "card";
    card.setAttribute('data-border', cardData.border); // Add border type for export

    // Add controls if requested
    if (includeControls) {
      const controls = this.createCardControls(cardData, mode);
      card.appendChild(controls);
    }

    // Create blurred background if image data is available
    let imageDataForBackground = cardData.imageData;
    
    // For galleries, use the first gallery item's image if no imageData is set
    if (!imageDataForBackground && cardData.isGallery && cardData.galleryItems && cardData.galleryItems.length > 0) {
      imageDataForBackground = cardData.galleryItems[0].imageData;
    }
    
    if (imageDataForBackground) {
      const blurredBackground = this.createBlurredBackground(imageDataForBackground);
      card.appendChild(blurredBackground);
    }

    // Create image container
    const imageContainer = this.createImageContainer(cardData, borderColor, callId);
    
    // Create tags container
    const tagsContainer = this.createTagsContainer(cardData);

    // Create content container (now returns an object with content and onUseSection)
    const { content, onUseSection } = this.createContentContainer(cardData, borderColor);

    // Create wrapper and visual content container
    const cardWrapper = document.createElement("div");
    cardWrapper.className = "card-wrapper";
    cardWrapper.appendChild(tagsContainer);
    cardWrapper.appendChild(content);

    // Add cooldown and ammo sections outside the clipped content container
    if (onUseSection) {
      // Cooldown (only if there are on use effects)
      if (cardData.cooldown && cardData.cooldown.trim()) {
        const cooldownDiv = this.createCooldownSection(cardData, borderColor);
        cardWrapper.appendChild(cooldownDiv);
      }

      // Ammo
      if (cardData.ammo && cardData.ammo.trim()) {
        const ammoDiv = this.createAmmoSection(cardData, borderColor);
        cardWrapper.appendChild(ammoDiv);
      }
    }

    const visualContent = document.createElement("div");
    visualContent.className = "card-visual-content";
    visualContent.appendChild(imageContainer);
    visualContent.appendChild(cardWrapper);
    
    card.appendChild(visualContent);

    console.log('✅ Card element built successfully');
    return card;
  }






  
  /**
   * Create card control buttons based on mode
   */
  static createCardControls(cardData, mode) {
    const cardControls = document.createElement("div");
    cardControls.className = "card-controls";

    if (mode === 'generator') {
      // Edit button
      const editBtn = document.createElement("button");
      editBtn.className = "card-edit-btn";
      editBtn.innerHTML = "✏️";
      editBtn.title = "Edit this card";
      editBtn.onclick = function() {
        console.log('✏️ [DEBUG] Edit button clicked');
        if (window.editCard) {
          window.editCard(cardData);
        } else {
          console.error('❌ [DEBUG] editCard function not found');
        }
      };

      // Export button
      const exportBtn = document.createElement("button");
      exportBtn.className = "card-export-btn";
      exportBtn.innerHTML = "💾";
      exportBtn.title = "Export this card";
      exportBtn.onclick = function() {
        console.log('💾 [DEBUG] Export button clicked');
        if (window.toggleExportMenu) {
          window.toggleExportMenu(exportBtn, cardData);
        } else{
          console.error('❌ [DEBUG] toggleExportMenu not found');
        }
      };

      // Delete button
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "card-delete-btn";
      deleteBtn.innerHTML = "×";
      deleteBtn.title = "Delete this card";
      deleteBtn.onclick = function() {
        if (window.clearCard) {
          window.clearCard(deleteBtn.closest('.card'));
        }
      };

      cardControls.appendChild(editBtn);
      cardControls.appendChild(exportBtn);
      cardControls.appendChild(deleteBtn);

    } else if (mode === 'browser') {
      // Upvote button removed - now handled by individual page controllers
      // This prevents duplicate/non-working upvote buttons
    }

    return cardControls;
  }

  /**
   * Create blurred background element
   */
  static createBlurredBackground(imageData) {
    const blurredBackground = document.createElement("div");
    blurredBackground.className = "card-blurred-background";
    
    const backgroundImg = document.createElement("img");
    backgroundImg.src = imageData;
    backgroundImg.alt = "Blurred background";
    backgroundImg.onerror = function() {
      console.log('❌ Blurred background image failed to load');
      blurredBackground.style.display = 'none';
    };
    
    blurredBackground.appendChild(backgroundImg);
    return blurredBackground;
  }

  /**
   * Create image container with frame and scaling values
   */
  static createImageContainer(cardData, borderColor, callId = 'unknown') {
    console.log(`🔍 createImageContainer received cardData.scalingValues:`, JSON.stringify(cardData.scalingValues, null, 2), `[Call ID: ${callId}]`);
    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";
    imageContainer.style.border = `3px solid ${borderColor}`;

    // Create image clipping wrapper
    const imageClipWrapper = document.createElement("div");
    imageClipWrapper.className = "image-clip-wrapper";

    // For galleries, use the first gallery item's image if no imageData is set
    let imageData = cardData.imageData;
    console.log('🖼️ CardGenerator - Image data check:', {
      hasImageData: !!cardData.imageData,
      isGallery: cardData.isGallery,
      hasGalleryItems: !!(cardData.galleryItems && cardData.galleryItems.length > 0),
      galleryItemsCount: cardData.galleryItems ? cardData.galleryItems.length : 0,
      firstGalleryItemImage: cardData.galleryItems && cardData.galleryItems[0] ? !!cardData.galleryItems[0].imageData : false,
      imageDataLength: cardData.imageData ? cardData.imageData.length : 0,
      firstGalleryItemImageLength: cardData.galleryItems && cardData.galleryItems[0] && cardData.galleryItems[0].imageData ? cardData.galleryItems[0].imageData.length : 0
    });
    
    if (!imageData && cardData.isGallery && cardData.galleryItems && cardData.galleryItems.length > 0) {
      imageData = cardData.galleryItems[0].imageData;
      console.log('🖼️ Using first gallery item image for gallery display:', !!imageData, 'Length:', imageData ? imageData.length : 0);
    }

    if (imageData) {
      const img = document.createElement("img");
      img.className = "uploaded-image";
      img.src = imageData;
      img.onerror = function() {
        console.log('❌ Image failed to load:', imageData);
        imageClipWrapper.style.background = '#333';
        imageClipWrapper.innerHTML = '<div style="color: white; text-align: center; padding: 20px;">Image not available</div>';
      };
      img.onload = function() {
        console.log('✅ Image loaded successfully');
      };
      imageClipWrapper.appendChild(img);
    } else {
      console.log('❌ No image data available for card');
      imageClipWrapper.style.background = '#333';
      imageClipWrapper.innerHTML = '<div style="color: white; text-align: center; padding: 20px;">No image</div>';
    }

    imageContainer.appendChild(imageClipWrapper);

    // Add frame overlay
    const frame = this.createFrameElement(cardData.border, cardData.itemSize);
    imageContainer.appendChild(frame);

    // Add scaling values if any exist
    // console.log(`🔍 About to create scaling container with data:`, JSON.stringify(cardData.scalingValues, null, 2), `[Call ID: ${callId}]`);
    // console.log(`🔍 Full cardData object at this point:`, JSON.stringify(cardData, null, 2), `[Call ID: ${callId}]`);
    const scalingContainer = this.createScalingValuesContainer(cardData.scalingValues, callId);
    // console.log('🔍 Scaling container created with', scalingContainer.children.length, 'children');
    if (scalingContainer.children.length > 0) {
      // console.log('✅ Adding scaling container to image container');
      imageContainer.appendChild(scalingContainer);
    } else {
      // console.log('⚠️ No scaling values to display');
    }

    // Add multicast icon if present
    if (cardData.multicast && parseInt(cardData.multicast) > 1) {
      const multicastIcon = this.createMulticastIcon(cardData.multicast);
      imageContainer.appendChild(multicastIcon);
    }

    // Add ammo component if present
    if (cardData.ammo && parseInt(cardData.ammo) > 0) {
      const ammoComponent = this.createAmmoComponent(cardData.ammo);
      imageContainer.appendChild(ammoComponent);
    }

    return imageContainer;
  }

  /**
   * Create multicast icon with value
   */
  static createMulticastIcon(multicastValue) {
    const multicastContainer = document.createElement("div");
    multicastContainer.className = "multicast-icon-container";

    // Create multicast icon
    const icon = document.createElement("img");
    icon.src = "images/elements/multicast.png";
    icon.alt = "Multicast";
    icon.style.width = "50px";
    icon.style.height = "50px";
    icon.onerror = function() { 
      console.warn('⚠️ Multicast icon failed to load');
      this.style.display = 'none'; 
    };

    // Create multicast value text
    const valueText = document.createElement("span");
    valueText.textContent = `x ${multicastValue}`;

    multicastContainer.appendChild(icon);
    multicastContainer.appendChild(valueText);

    return multicastContainer;
  }

  /**
   * Create ammo component with visual ammo count
   */
  static createAmmoComponent(ammoCount) {
    const ammoContainer = document.createElement("div");
    ammoContainer.className = "ammo-component";
    
    // Create ammo images container
    const ammoImagesContainer = document.createElement("div");
    ammoImagesContainer.className = "ammo-images-container";
    
    // Add left edge (flipped)
    const leftEdge = document.createElement("img");
    leftEdge.src = "images/elements/ammo/edge.png";
    leftEdge.alt = "Ammo edge";
    leftEdge.style.transform = "scaleX(-1)"; // Flip horizontally
    leftEdge.onerror = function() { 
      console.warn('⚠️ Ammo edge image failed to load');
      this.style.display = 'none'; 
    };
    ammoImagesContainer.appendChild(leftEdge);
    
    // Add middle segments based on ammo count (capped at 6)
    const displayAmmoCount = Math.min(ammoCount, 6);
    for (let i = 0; i < displayAmmoCount; i++) {
      const middleSegment = document.createElement("img");
      middleSegment.src = "images/elements/ammo/middle.png";
      middleSegment.alt = "Ammo middle";
      middleSegment.onerror = function() { 
        console.warn('⚠️ Ammo middle image failed to load');
        this.style.display = 'none'; 
      };
      ammoImagesContainer.appendChild(middleSegment);
    }
    
    // Add right edge
    const rightEdge = document.createElement("img");
    rightEdge.src = "images/elements/ammo/edge.png";
    rightEdge.alt = "Ammo edge";
    rightEdge.onerror = function() { 
      console.warn('⚠️ Ammo edge image failed to load');
      this.style.display = 'none'; 
    };
    ammoImagesContainer.appendChild(rightEdge);
    
    ammoContainer.appendChild(ammoImagesContainer);
    
    return ammoContainer;
  }

  /**
   * Create tags container
   */
  static createTagsContainer(cardData) {
    console.log('🏷️ Creating tags container with tags:', cardData.tags);
    
    const tagsContainer = document.createElement("div");
    tagsContainer.className = "tags-container";

    // Only add item size tag if this is not a gallery preview
    if (!cardData.isGallery) {
      const itemSizeTag = document.createElement("span");
      itemSizeTag.className = "item-tag";
      itemSizeTag.textContent = cardData.itemSize.toUpperCase();
      tagsContainer.appendChild(itemSizeTag);
    }

    // Add additional tags
    cardData.tags.forEach(tagText => {
      if (tagText && tagText.trim()) {
        console.log('🏷️ Adding tag:', tagText);
        const tag = document.createElement("span");
        tag.className = "item-tag";
        tag.textContent = tagText.trim().toUpperCase();
        tagsContainer.appendChild(tag);
      }
    });

    console.log('✅ Tags container created with', tagsContainer.children.length, 'tags');
    return tagsContainer;
  }

  /**
   * Create main content container
   */
  static createContentContainer(cardData, borderColor) {
    const content = document.createElement("div");
    content.className = "card-content";
    
    // Map border quality to background class
    const backgroundClassMap = {
      'bronze': 'bronze-bg',
      'silver': 'silver-bg',
      'gold': 'gold-bg',
      'diamond': 'diamond-bg',
      'legendary': 'legendary-bg'
    };
    
    const backgroundClass = backgroundClassMap[cardData.border] || 'bronze-bg';
    content.classList.add(backgroundClass);
    
    // Add legendary class for special corner cutting
    if (cardData.border === 'legendary') {
      content.classList.add('legendary');
    }
    
    console.log('Background image applied to card content - Rarity:', cardData.border, 'Class:', backgroundClass);

    // Top section with title and hero
    const topSection = this.createTopSection(cardData, borderColor);
    content.appendChild(topSection);

    // On use effects section or divider
    const onUseElement = this.createOnUseSection(cardData, borderColor);
    content.appendChild(onUseElement);
    
    // Check if this is an on-use section (for positioning cooldown/ammo)
    const onUseSection = onUseElement.classList.contains('on-use-section') ? onUseElement : null;

    // Passive effects section - now checks for array and length
    if (cardData.passiveEffects && cardData.passiveEffects.length > 0) {
      const passiveSection = this.createPassiveSection(cardData, borderColor);
      content.appendChild(passiveSection);
    }

    // Apply corner cuts after content is rendered
    this.applyCardCornerCuts(content);

    return { content, onUseSection };
  }

  /**
   * Create top section with title and hero
   */
  static createTopSection(cardData, borderColor) {
    const topSection = document.createElement("div");
    topSection.className = "text-section hero-header";

    const itemTitle = document.createElement("div");
    itemTitle.className = "item-title";
    itemTitle.textContent = cardData.itemName;
    itemTitle.style.paddingLeft = '5px';

    const heroImg = document.createElement("img");
    
    // Handle custom hero image
    if (cardData.hero === 'Custom' && cardData.customHeroImage) {
      heroImg.src = cardData.customHeroImage;
    } else {
      heroImg.src = `images/characters/${cardData.hero.toLowerCase()}.png`;
    }
    
    heroImg.alt = cardData.hero;
    heroImg.onerror = function() {
      this.style.display = 'none';
    };

    topSection.appendChild(itemTitle);
    topSection.appendChild(heroImg);
    return topSection;
  }

  /**
   * Create on-use effects section
   */
  static createOnUseSection(cardData, borderColor) {
    console.log('⚡ Creating on-use section with effects:', cardData.onUseEffects);
    
    const effectsContainer = document.createElement("div");
    let hasEffects = false;

    // Add on use effects
    cardData.onUseEffects.forEach(effect => {
      if (effect && effect.trim()) {
        console.log('⚡ Adding on-use effect:', effect);
        const effectLine = document.createElement("div");
        effectLine.className = "on-use-line";
        
        // Add 4px padding above the first on-use line
        if (!hasEffects) {
          effectLine.style.paddingTop = '4px';
        }

        const icon = document.createElement("img");
        icon.src = "images/ui/arrows/use-arrow.png";
        icon.alt = "-";
        icon.className = "on-use-arrow";
        icon.onerror = function() { this.style.display = 'none'; };

        const text = document.createElement("span");
        text.className = "on-use-content";
        if (typeof KeywordProcessor !== 'undefined') {
          text.innerHTML = KeywordProcessor.processKeywordText(effect);
          
          // Wrap every word in its own span for better control
          const textNodes = [];
          const walker = document.createTreeWalker(
            text,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let node;
          while (node = walker.nextNode()) {
            if (node.textContent.trim()) {
              textNodes.push(node);
            }
          }
          
          textNodes.forEach(textNode => {
            const words = textNode.textContent.split(/\s+/);
            const fragment = document.createDocumentFragment();
            
            words.forEach(word => {
              if (word.trim()) {
                const span = document.createElement('span');
                span.className = 'on-use-text';
                span.textContent = word;
                fragment.appendChild(span);
                // Add a space after each word except the last one
                if (word !== words[words.length - 1]) {
                  fragment.appendChild(document.createTextNode(' '));
                }
              }
            });
            
            textNode.parentNode.replaceChild(fragment, textNode);
          });
        } else {
          console.warn('⚠️ KeywordProcessor not available, using plain text');
          text.textContent = effect;
        }

        effectLine.appendChild(icon);
        effectLine.appendChild(text);
        effectsContainer.appendChild(effectLine);
        hasEffects = true;
      }
    });

    // Add multicast if > 1
    if (cardData.multicast && parseInt(cardData.multicast) > 1) {
      const effectLine = document.createElement("div");
      effectLine.className = "on-use-line";

      const icon = document.createElement("img");
      icon.src = "images/ui/arrows/use-arrow.png";
      icon.alt = "-";
      icon.className = "on-use-arrow";
      icon.onerror = function() { this.style.display = 'none'; };

      const text = document.createElement("span");
      text.innerHTML = "Multicast: " + cardData.multicast;

      effectLine.appendChild(icon);
      effectLine.appendChild(text);
      effectsContainer.appendChild(effectLine);
      hasEffects = true;
    }

    // Add crit if present
    if (cardData.crit && cardData.crit.trim()) {
      const critLineHR = document.createElement("hr");
      critLineHR.className = "crit-line-hr";
      effectsContainer.appendChild(critLineHR);

      const text = document.createElement("span");
      if (typeof KeywordProcessor !== 'undefined') {
        text.innerHTML = "Crit Chance: " + KeywordProcessor.processKeywordText("/cr") + cardData.crit + "%";
      } else {
        text.innerHTML = "Crit Chance: " + cardData.crit + "%";
      }
      const effectLine = document.createElement("div");
      effectLine.className = "crit-line";

      effectLine.appendChild(text);
      effectsContainer.appendChild(effectLine);
      hasEffects = true;
    }

    if (hasEffects) {
      // Create on-use section with background image
      const onUseSection = document.createElement("div");
      onUseSection.className = "text-section on-use-section";
      
      // Map border quality to background class
      const backgroundClassMap = {
        'bronze': 'bronze-bg',
        'silver': 'silver-bg',
        'gold': 'gold-bg',
        'diamond': 'diamond-bg',
        'legendary': 'legendary-bg'
      };
      
      const backgroundClass = backgroundClassMap[cardData.border] || 'bronze-bg';
      onUseSection.classList.add(backgroundClass);
      
      onUseSection.appendChild(effectsContainer);
      
      // Debug: Check if background image was applied
      setTimeout(() => {
        const computedStyle = window.getComputedStyle(onUseSection);
        console.log('🎨 Background-image applied:', computedStyle.backgroundImage);
        console.log('🎨 Background-size:', computedStyle.backgroundSize);
        console.log('🎨 Background-position:', computedStyle.backgroundPosition);
        console.log('🎨 Background-repeat:', computedStyle.backgroundRepeat);
        
        // Test if the image loads
        const testImg = new Image();
        const imageUrl = `images/skill-frames/Active/active${cardData.border.charAt(0).toUpperCase() + cardData.border.slice(1)}.png`;
        testImg.onload = () => console.log('✅ Active background image loads successfully:', imageUrl);
        testImg.onerror = () => console.log('❌ Active background image failed to load:', imageUrl);
        testImg.src = imageUrl;
      }, 100);
      
      console.log('✅ On-use section with background image created successfully');
      console.log('🎨 Applied background class for quality:', cardData.border, '->', backgroundClass);
      return onUseSection;
    } else {
      // Create divider that replaces the on-use section entirely
      const dividerContainer = document.createElement("div");
      dividerContainer.className = "skill-divider-container";
      dividerContainer.style.width = '100%';
      dividerContainer.style.boxSizing = 'border-box';
      
      const dividerImage = document.createElement("img");
      dividerImage.className = "skill-divider";
      dividerImage.src = `images/skill-frames/dividers/${cardData.border}_divider.png`;
      dividerImage.alt = '';
      dividerImage.style.width = '100%';
      dividerImage.style.height = 'auto';
      dividerImage.style.display = 'block';
      dividerImage.onerror = function() {
        // Replace with colored line if image fails to load
        dividerContainer.innerHTML = `<div class="skill-divider-fallback" style="background-color: ${borderColor}; height: 2px; width: 100%;"></div>`;
      };
      dividerContainer.appendChild(dividerImage);
      
      console.log('✅ Divider created successfully (replacing on-use section)');
      return dividerContainer;
    }
  }

  /**
   * Create passive effects section - now handles multiple effects and quests
   */
  static createPassiveSection(cardData, borderColor) {
    console.log('🛡️ Creating passive section with effects:', cardData.passiveEffects);
    console.log('🎯 Creating quest section with quests:', cardData.quests);
    
    const passiveSection = document.createElement("div");
    passiveSection.className = "text-section passive-section";
    
    // Create container for all passive effects
    const passiveContainer = document.createElement("div");
    passiveContainer.className = "passive-effects-container";
    
    // Add each passive effect on its own line
    cardData.passiveEffects.forEach((effect, index) => {
      if (effect && effect.trim()) {
        console.log('🛡️ Adding passive effect:', effect);
        
        const effectLine = document.createElement("div");
        effectLine.className = "passive-effect-line";
        
        // Add some spacing between multiple effects
        if (index > 0) {
          effectLine.style.marginTop = "8px";
        }
        
        if (typeof KeywordProcessor !== 'undefined') {
          effectLine.innerHTML = KeywordProcessor.processKeywordText(effect.trim());
          
          // Wrap only plain text nodes in spans, preserve existing styled spans
          const textNodes = [];
          const walker = document.createTreeWalker(
            effectLine,
            NodeFilter.SHOW_TEXT,
            null,
            false
          );
          
          let node;
          while (node = walker.nextNode()) {
            // Only process text nodes that are not already inside styled spans
            if (node.textContent.trim() && !node.parentElement.classList.contains('custom-color') && !node.parentElement.classList.contains('key-text')) {
              textNodes.push(node);
            }
          }
          
          textNodes.forEach(textNode => {
            const words = textNode.textContent.split(/\s+/);
            const fragment = document.createDocumentFragment();
            
            words.forEach(word => {
              if (word.trim()) {
                const span = document.createElement('span');
                span.className = 'passive-text';
                span.textContent = word;
                fragment.appendChild(span);
                // Add a space after each word except the last one
                if (word !== words[words.length - 1]) {
                  fragment.appendChild(document.createTextNode(' '));
                }
              }
            });
            
            textNode.parentNode.replaceChild(fragment, textNode);
          });
        } else {
          console.warn('⚠️ KeywordProcessor not available, using plain text');
          effectLine.textContent = effect.trim();
        }
        
        passiveContainer.appendChild(effectLine);
      }
    });
    
    // Add quest lines after passive effects
    if (cardData.quests && cardData.quests.length > 0) {
      console.log('🎯 Adding quest lines to passive section');
      
      cardData.quests.forEach((quest, index) => {
        if (quest.condition && quest.reward) {
          console.log('🎯 Adding quest:', quest);
          
          // Create quest line container
          const questLineContainer = document.createElement("div");
          questLineContainer.className = "quest-line-container";
          questLineContainer.style.marginTop = "12px";
          questLineContainer.style.position = "relative";
          
          // Add divider at the top (or "or" text if checkbox is checked)
          if (quest.or) {
            const orText = document.createElement("div");
            orText.textContent = "or";
            orText.style.color = "rgb(251, 225, 183)";
            orText.style.fontWeight = "bold";
            orText.style.textAlign = "center";
            orText.style.marginBottom = "8px";
            orText.style.fontSize = "14px";
            questLineContainer.appendChild(orText);
          } else {
            const dividerImage = document.createElement("img");
            dividerImage.src = `images/skill-frames/dividers/${cardData.border}_divider.png`;
            dividerImage.alt = "";
            dividerImage.style.width = "100%";
            dividerImage.style.height = "auto";
            dividerImage.style.display = "block";
            dividerImage.style.marginBottom = "8px";
            dividerImage.onerror = function() {
              // Replace with colored line if image fails to load
              const fallbackDiv = document.createElement("div");
              fallbackDiv.style.backgroundColor = borderColor;
              fallbackDiv.style.height = "2px";
              fallbackDiv.style.width = "100%";
              fallbackDiv.style.marginBottom = "8px";
              questLineContainer.insertBefore(fallbackDiv, questLineContainer.firstChild);
            };
            questLineContainer.appendChild(dividerImage);
          }
          
          // Create quest content container
          const questContent = document.createElement("div");
          questContent.className = "quest-content";
          questContent.style.display = "flex";
          questContent.style.alignItems = "center";
          questContent.style.justifyContent = "space-between";
          questContent.style.marginLeft = "20px";
          
          // Quest condition and value
          const questCondition = document.createElement("div");
          questCondition.className = "quest-condition";
          questCondition.style.flex = "1";
          questCondition.style.marginRight = "10px";
          questCondition.style.display = "flex";
          questCondition.style.justifyContent = "space-between";
          questCondition.style.alignItems = "center";
          
          // Create condition text container
          const conditionText = document.createElement("div");
          conditionText.style.flex = "1";
          
          if (typeof KeywordProcessor !== 'undefined') {
            conditionText.innerHTML = KeywordProcessor.processKeywordText(quest.condition);
          } else {
            conditionText.textContent = quest.condition;
          }
          
          // Add value display aligned to the right
          const questValue = document.createElement("span");
          questValue.textContent = `0/${quest.value}`;
          questValue.style.color = "rgb(251, 225, 183)";
          questValue.style.fontWeight = "bold";
          questValue.style.marginLeft = "auto";
          
          questCondition.appendChild(conditionText);
          questCondition.appendChild(questValue);
          
          questContent.appendChild(questCondition);
          
          // Vertical divider
          const verticalDivider = document.createElement("div");
          verticalDivider.style.width = "2px";
          verticalDivider.style.height = "20px";
          verticalDivider.style.backgroundColor = borderColor;
          verticalDivider.style.margin = "0 10px";
          questContent.appendChild(verticalDivider);
          
          // Quest reward
          const questReward = document.createElement("div");
          questReward.className = "quest-reward";
          questReward.style.flex = "0 0 auto";
          questReward.style.textAlign = "right";
          questReward.style.width = "fit-content";
          
          if (typeof KeywordProcessor !== 'undefined') {
            questReward.innerHTML = KeywordProcessor.processKeywordText(quest.reward);
          } else {
            questReward.textContent = quest.reward;
          }
          
          questContent.appendChild(questReward);
          
          questLineContainer.appendChild(questContent);
          passiveContainer.appendChild(questLineContainer);
        }
      });
    }
    
    passiveSection.appendChild(passiveContainer);
    console.log('✅ Passive section created with', cardData.passiveEffects.length, 'effects and', (cardData.quests?.length || 0), 'quests');
    return passiveSection;
  }

  /**
   * Create cooldown section
   */
  static createCooldownSection(cardData, borderColor) {
    const cooldownDiv = document.createElement("div");
    cooldownDiv.className = "cooldown-section";
    cooldownDiv.innerHTML = `<span>${cardData.cooldown}</span><span class="sec-text">sec</span>`;
    
    // Add cooldown border overlay
    const cooldownBorder = this.createCooldownBorderElement(cardData.border);
    cooldownDiv.appendChild(cooldownBorder);
    
    return cooldownDiv;
  }

  /**
   * Create ammo section
   */
  static createAmmoSection(cardData, borderColor) {
    const ammoDiv = document.createElement("div");
    ammoDiv.className = "ammo-section";
    ammoDiv.style.borderImage = `url('images/skill-frames/borders/bronze_frame.png') 30 fill / 35px / 0 round`;
    ammoDiv.style.width = '35px';
    ammoDiv.style.transform = 'translateX(320px)';
    
    const ammoImg = document.createElement("img");
    ammoImg.src = "images/keywords/effects/ammo.png";
    ammoImg.alt = "Ammo";
    ammoImg.onerror = function() { this.style.display = 'none'; };
    ammoDiv.appendChild(ammoImg);
    
    const ammoText = document.createElement("span");
    ammoText.textContent = cardData.ammo;
    ammoDiv.appendChild(ammoText);
    
    // Debug: Log the full CSS position styles after creation
    console.log('🔍 Ammo section created with styles:', {
      transform: ammoDiv.style.transform,
      width: ammoDiv.style.width,
      borderImage: ammoDiv.style.borderImage,
      className: ammoDiv.className
    });
    
    return ammoDiv;
  }

  /**
   * Apply card sizing and positioning
   */
 static applyCardSizing(cardElement, cardData) {
  const imageContainer = cardElement.querySelector('.image-container');

  if (imageContainer) {
    let widthRatio = 1.0;
    if (cardData.itemSize === "Small") {
      widthRatio = 0.5;
    } else if (cardData.itemSize === "Large") {
      widthRatio = 1.5;
    }

    const containerWidth = 225 * widthRatio;
    imageContainer.style.width = containerWidth + "px";

    const img = imageContainer.querySelector('.uploaded-image');
    if (img) {
      img.style.height = "100%";
      img.style.width = "auto";
      img.style.objectFit = "cover";
      img.style.objectPosition = "center";
    }
  }
}



  // Helper methods
  static getBorderColor(value) {
    switch(value?.toLowerCase()) {
      case 'bronze': return 'rgb(205, 127, 50)';
      case 'silver': return 'silver';
      case 'gold': return 'gold';
      case 'diamond': return 'rgb(185, 242, 255)';
      case 'legendary': return 'rgb(124, 46, 44)';
      default: return 'gold';
    }
  }

  static createFrameElement(quality, size) {
    const sizeMap = { 'Small': 's', 'Medium': 'm', 'Large': 'l' };
    const frameSize = sizeMap[size] || 'm';
    const frameQuality = quality?.toLowerCase() || 'gold';
    
    const frameDiv = document.createElement("div");
    frameDiv.className = "card-frame";
    
    const frameImg = document.createElement("img");
    frameImg.src = `images/skill-content/skill-borders/${frameQuality}/${frameQuality}_${frameSize}_frame.png`;
    frameImg.alt = `${quality} ${size} frame`;
    frameImg.onerror = function() {
      frameDiv.style.display = 'none';
    };
    
    frameDiv.appendChild(frameImg);
    return frameDiv;
  }

  static createCooldownBorderElement(quality) {
    const qualityMap = {
      'bronze': 'Bronze', 'silver': 'silver', 'gold': 'gold',
      'diamond': 'diamond', 'legendary': 'Legendary'
    };
    
    const mappedQuality = qualityMap[quality?.toLowerCase()] || 'gold';
    const borderDiv = document.createElement("div");
    borderDiv.className = "cooldown-border";
    borderDiv.style.cssText = `
      position: absolute; top: 50%; left: 50%; width: 130%; height: 130%;
      transform: translate(calc(-50% + 2px), -50%); pointer-events: none; z-index: 0;
      background-image: url('images/skill-content/cooldown/${mappedQuality}_Cooldown.png');
      background-size: 100% 100%; background-repeat: no-repeat; background-position: center;
    `;
    
    return borderDiv;
  }

  static createScalingValuesContainer(scalingData, callId = 'unknown') {
    // console.log(`🔍 Creating scaling values container with data:`, JSON.stringify(scalingData, null, 2), `[Call ID: ${callId}]`);
    const container = document.createElement("div");
    container.className = "scaling-values-container";
    
    const scalingTypes = ['heal', 'regen', 'shield', 'damage', 'poison', 'burn'];
    
    scalingTypes.forEach(type => {
      const value = scalingData[type];
      // console.log(`🔍 Checking ${type} scaling value:`, value);
      if (value && value.toString().trim()) {
        // console.log(`✅ Creating ${type} scaling element with value:`, value);
        const scalingElement = document.createElement("div");
        scalingElement.className = `scaling-value ${type}`;
        
        // Create gem image
        const gemImg = document.createElement("img");
        gemImg.className = "scaling-gem";
        
        // Set gem image based on type
        if (type === 'regen') {
          gemImg.src = "images/CardGems/CardGem_Regen_TD.png";
        } else {
          gemImg.src = `images/CardGems/CardGem_${type.charAt(0).toUpperCase() + type.slice(1)}_TD.png`;
        }
        
        gemImg.alt = `${type} gem`;
        gemImg.onerror = function() {
          // Fallback to colored background if image fails to load
          scalingElement.style.background = this.getScalingColor(type);
          gemImg.style.display = 'none';
        };
        
        // Create value text
        const valueText = document.createElement("span");
        valueText.className = "scaling-value-text";
        valueText.textContent = value.toString().trim();
        
        scalingElement.appendChild(gemImg);
        scalingElement.appendChild(valueText);
        container.appendChild(scalingElement);
      }
    });
    
    // Add custom scaling values
    console.log(`🔍 Checking for custom scaling values in scalingData:`, scalingData, `[Call ID: ${callId}]`);
    if (scalingData.custom) {
      console.log('🎨 Processing custom scaling values:', scalingData.custom.length, 'values');
      scalingData.custom.forEach(customValue => {
        console.log('🔍 Checking custom scaling value:', customValue);
        if (customValue.value && customValue.value.toString().trim()) {
          console.log('✅ Creating custom scaling element with value:', customValue.value);
          const scalingElement = document.createElement("div");
          scalingElement.className = "scaling-value custom";
          
          // Create gem image with custom color
          const gemImg = document.createElement("img");
          gemImg.className = "scaling-gem";
          gemImg.src = "images/CardGems/CardGem_Blank.png";
          gemImg.style.filter = customValue.filterString || `hue-rotate(${customValue.hue || 0}deg) saturate(${customValue.saturation || 1}) brightness(${customValue.brightness || 1})`;
          gemImg.alt = "custom gem";
          
          // Create value text
          const valueText = document.createElement("span");
          valueText.className = "scaling-value-text";
          valueText.textContent = customValue.value.toString().trim();
          
          scalingElement.appendChild(gemImg);
          scalingElement.appendChild(valueText);
          container.appendChild(scalingElement);
        }
      });
    }
    
    return container;
  }
  
  static getScalingColor(type) {
    const colors = {
      heal: 'rgb(143, 234, 49)',
      regen: 'rgb(100, 255, 60)',
      shield: 'rgb(245, 208, 33)',
      damage: 'rgb(244, 82, 60)',
      poison: 'rgb(13, 190, 79)',
      burn: 'rgb(253, 146, 63)'
    };
    return colors[type] || '#333';
  }

  /**
   * Advanced color conversion utility for CSS filters
   * Based on Stack Overflow approach: https://stackoverflow.com/questions/29037023/how-to-calculate-required-hue-rotate-to-generate-specific-colour
   * Converts RGB colors to precise filter chains using base color + adjustments
   */
  static convertRgbToAdvancedFilters(r, g, b) {
    // Normalize RGB values (0-255 to 0-1)
    const rNorm = r / 255;
    const gNorm = g / 255;
    const bNorm = b / 255;
    
    // Calculate HSL values for target color
    const max = Math.max(rNorm, gNorm, bNorm);
    const min = Math.min(rNorm, gNorm, bNorm);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
      h = s = 0; // achromatic
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
        case gNorm: h = (bNorm - rNorm) / d + 2; break;
        case bNorm: h = (rNorm - gNorm) / d + 4; break;
      }
      h /= 6;
    }
    
    // Convert to degrees and percentages
    const targetHue = Math.round(h * 360);
    const targetSaturation = Math.round(s * 100);
    const targetLightness = Math.round(l * 100);
    
    // Step 1: Create base color using brightness(50%) sepia(1)
    // This produces approximately rgb(178, 160, 128) = hsl(38, 24.5%, 60%)
    const baseHue = 38;
    const baseSaturation = 24.5;
    const baseLightness = 60;
    
    // Step 2: Calculate adjustments needed to reach target color
    const hueAdjustment = targetHue - baseHue;
    const saturationAdjustment = targetSaturation - baseSaturation;
    const lightnessAdjustment = targetLightness - baseLightness;
    
    // Step 3: Build the filter string
    // Start with base color: brightness(50%) sepia(1)
    // Then apply adjustments: hue-rotate, saturate, brightness
    const filters = [
      'brightness(50%)',
      'sepia(1)',
      `hue-rotate(${hueAdjustment}deg)`,
      'saturate(500%)',
      `brightness(${Math.max(0, 100 + lightnessAdjustment)}%)`
    ];
    
    console.log(`🎨 Color conversion - Target: rgb(${r},${g},${b}) = hsl(${targetHue},${targetSaturation}%,${targetLightness}%)`);
    console.log(`🎨 Color conversion - Adjustments: hue=${hueAdjustment}°, sat=${saturationAdjustment}%, light=${lightnessAdjustment}%`);
    console.log(`🎨 Color conversion - Filter: ${filters.join(' ')}`);
    
    return filters.join(' ');
  }

  /**
   * Convert hex color to advanced CSS filters
   */
  static hexToAdvancedFilters(hexColor) {
    // Remove # if present
    const hex = hexColor.replace('#', '');
    
    // Parse RGB values
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    return this.convertRgbToAdvancedFilters(r, g, b);
  }

  /**
   * Apply corner cuts to card content after rendering
   */
  static applyCardCornerCuts(cardContentElement) {
    console.log('🎨 Starting applyCardCornerCuts...', cardContentElement);
    
    // Wait for the next frame to ensure content is rendered
    requestAnimationFrame(() => {
      console.log('🎨 requestAnimationFrame callback executing...');
      
      // Get the actual rendered height
      const rect = cardContentElement.getBoundingClientRect();
      const height = rect.height;
      
      console.log('🎨 Element dimensions:', {
        width: rect.width,
        height: height,
        top: rect.top,
        left: rect.left
      });
      
      // Check if this is a legendary card for special treatment
      const isLegendary = cardContentElement.classList.contains('legendary');
      
      let clipPathValue;
      
      if (isLegendary) {
        // Legendary cards: extra top corner cuts, no bottom corner cuts
        clipPathValue = `polygon(
          14px 0,           /* Top-left: cut 14px from left (12px + 2px extra) */
          286px 0,          /* Top-right: cut 14px from right (12px + 2px extra) */
          300px 18px,       /* Top-right: cut 18px from top (16px + 2px extra) */
          300px 100%,       /* Bottom-right: no cut */
          0 100%,           /* Bottom-left: no cut */
          0 18px            /* Top-left: cut 18px from top (16px + 2px extra) */
        )`;
      } else {
        // All other cards: standard corner cuts on all corners
        clipPathValue = `polygon(
          12px 0,           /* Top-left: cut 12px from left */
          288px 0,          /* Top-right: cut 12px from right */
          300px 16px,       /* Top-right: cut 16px from top */
          300px calc(100% - 16px),  /* Bottom-right: cut 16px from bottom */
          288px 100%,       /* Bottom-right: cut 12px from right */
          12px 100%,        /* Bottom-left: cut 12px from left */
          0 calc(100% - 16px),      /* Bottom-left: cut 16px from bottom */
          0 16px            /* Top-left: cut 16px from top */
        )`;
      }
      
      cardContentElement.style.clipPath = clipPathValue;
      
      console.log('🎨 Applied clip-path:', clipPathValue);
      console.log(`🎨 Applied corner cuts to card content (height: ${height}px, legendary: ${isLegendary})`);
      
      // After corner cuts are applied, position cooldown and ammo sections
      this.finalizeCardPositioning(cardContentElement);
    });
  }

  /**
   * Final positioning of cooldown and ammo sections after everything is rendered
   */
  static finalizeCardPositioning(cardContentElement) {
    // Wait for another frame to ensure corner cuts are applied
    requestAnimationFrame(() => {
      this.positionCooldownAndAmmo(cardContentElement);
      
      // Set up continuous monitoring after 100ms
      setTimeout(() => {
        this.monitorAndReposition(cardContentElement);
      }, 100);
    });
  }

  /**
   * Position cooldown and ammo sections relative to on-use section
   */
  static positionCooldownAndAmmo(cardContentElement) {
    const onUseSection = cardContentElement.querySelector('.on-use-section');
    const cardWrapper = cardContentElement.closest('.card-wrapper');
    
    if (onUseSection && cardWrapper) {
      // Force layout recalculation
      cardContentElement.offsetHeight;
      onUseSection.offsetHeight;
      
      // Get the position of the on-use section relative to the card-wrapper
      const cardContentRect = cardContentElement.getBoundingClientRect();
      const onUseRect = onUseSection.getBoundingClientRect();
      const cardWrapperRect = cardWrapper.getBoundingClientRect();
      
      // Calculate the on-use section's position relative to the card-wrapper
      const onUseRelativeTop = onUseRect.top - cardWrapperRect.top;
      const onUseHeight = onUseSection.offsetHeight;
      const onUseCenterY = onUseRelativeTop + (onUseHeight / 2);
      
      const cooldownSection = cardWrapper.querySelector('.cooldown-section');
      const ammoSection = cardWrapper.querySelector('.ammo-section');
      
      if (cooldownSection && onUseHeight > 0) {
        // Position cooldown section at the center of the on-use section
        const cooldownHeight = 50; // Height of cooldown section
        const cooldownTop = onUseCenterY - (cooldownHeight / 2);
        cooldownSection.style.top = `${cooldownTop}px`;
        cooldownSection.style.transform = 'none'; // Remove default transform
        console.log('🎯 Positioned cooldown section at:', cooldownTop, 'px (on-use center:', onUseCenterY, 'px)');
        console.log('📊 Debug - onUseRelativeTop:', onUseRelativeTop, 'onUseHeight:', onUseHeight);
      }
      
              if (ammoSection && onUseHeight > 0) {
          // Position ammo section at the center of the on-use section (same as cooldown)
          const ammoHeight = 50; // Use same fixed height as cooldown section
          const ammoTop = onUseCenterY - (ammoHeight / 2);
          ammoSection.style.top = `${ammoTop}px`;
          // Preserve horizontal positioning while setting vertical position
          ammoSection.style.transform = 'translateX(320px)';
          console.log('🎯 Positioned ammo section at:', ammoTop, 'px (on-use center:', onUseCenterY, 'px)');
          
          // Debug: Log the full computed styles after positioning
          const computedStyle = window.getComputedStyle(ammoSection);
          console.log('🔍 Ammo section final computed styles:', {
            position: computedStyle.position,
            top: computedStyle.top,
            left: computedStyle.left,
            right: computedStyle.right,
            transform: computedStyle.transform,
            width: computedStyle.width,
            height: computedStyle.height,
            margin: computedStyle.margin,
            padding: computedStyle.padding,
            border: computedStyle.border
          });
        }
    } else {
      // No on-use section (divider instead), hide cooldown and ammo sections
      const cooldownSection = cardWrapper ? cardWrapper.querySelector('.cooldown-section') : null;
      const ammoSection = cardWrapper ? cardWrapper.querySelector('.ammo-section') : null;
      
      if (cooldownSection) {
        cooldownSection.style.display = 'none';
        console.log('🎯 Hidden cooldown section (no on-use effects)');
      }
      
      if (ammoSection) {
        ammoSection.style.display = 'none';
        console.log('🎯 Hidden ammo section (no on-use effects)');
      }
    }
  }

  /**
   * Monitor and reposition cooldown and ammo sections if needed
   */
  static monitorAndReposition(cardContentElement) {
    const onUseSection = cardContentElement.querySelector('.on-use-section');
    const cardWrapper = cardContentElement.closest('.card-wrapper');
    
    if (!cardWrapper) {
      return;
    }

    const cooldownSection = cardWrapper.querySelector('.cooldown-section');
    const ammoSection = cardWrapper.querySelector('.ammo-section');
    
    if (!cooldownSection && !ammoSection) {
      return;
    }

    if (!onUseSection) {
      // No on-use section (divider instead), hide cooldown and ammo sections
      if (cooldownSection) {
        cooldownSection.style.display = 'none';
      }
      if (ammoSection) {
        ammoSection.style.display = 'none';
      }
      return;
    }

    // Get current on-use section position relative to card-wrapper
    const onUseRect = onUseSection.getBoundingClientRect();
    const cardWrapperRect = cardWrapper.getBoundingClientRect();
    const onUseRelativeTop = onUseRect.top - cardWrapperRect.top;
    const onUseHeight = onUseSection.offsetHeight;
    const onUseCenterY = onUseRelativeTop + (onUseHeight / 2);

    let needsRepositioning = false;

    // Check cooldown section position
    if (cooldownSection && onUseHeight > 0) {
      const cooldownHeight = 50;
      const expectedCooldownTop = onUseCenterY - (cooldownHeight / 2);
      const currentCooldownTop = parseInt(cooldownSection.style.top) || 0;
      
      if (Math.abs(currentCooldownTop - expectedCooldownTop) > 2) { // 2px tolerance
        needsRepositioning = true;
        console.log('🔄 Cooldown needs repositioning:', currentCooldownTop, '->', expectedCooldownTop);
      }
    }

    // Check ammo section position
    if (ammoSection && onUseHeight > 0) {
      const ammoHeight = 50; // Use same fixed height as cooldown section
      const expectedAmmoTop = onUseCenterY - (ammoHeight / 2);
      const currentAmmoTop = parseInt(ammoSection.style.top) || 0;
      
      if (Math.abs(currentAmmoTop - expectedAmmoTop) > 2) { // 2px tolerance
        needsRepositioning = true;
        console.log('🔄 Ammo needs repositioning:', currentAmmoTop, '->', expectedAmmoTop);
      }
    }

    // Reposition if needed
    if (needsRepositioning) {
      console.log('🔄 Repositioning cooldown and ammo sections...');
      this.positionCooldownAndAmmo(cardContentElement);
      
      // Continue monitoring for a few more cycles
      setTimeout(() => {
        this.monitorAndReposition(cardContentElement);
      }, 100);
    } else {
      console.log('✅ Cooldown and ammo sections are properly positioned');
    }
  }
}

console.log('✅ CardGenerator class defined successfully');

// Make CardGenerator available globally
try {
  window.CardGenerator = CardGenerator;
  console.log('✅ CardGenerator added to window object successfully');
  console.log('🔍 Testing CardGenerator availability:', typeof window.CardGenerator);
} catch (error) {
  console.error('❌ Error adding CardGenerator to window:', error);
}

console.log('🎉 card-generator-js.js file loaded completely!');

// Final dependency check
console.log('📊 Dependency check:');
console.log('  - Validation:', typeof Validation !== 'undefined' ? '✅ Available' : '❌ Missing');
console.log('  - Messages:', typeof Messages !== 'undefined' ? '✅ Available' : '❌ Missing');
console.log('  - KeywordProcessor:', typeof KeywordProcessor !== 'undefined' ? '✅ Available' : '❌ Missing');

// Clear card function
window.clearCard = (cardElement) => {
  if (!cardElement) return;

  // Remove from DOM
  cardElement.remove();

  // Remove from cardsData array if present
  if (window.cardsData && cardElement.cardIndex !== undefined) {
    window.cardsData.splice(cardElement.cardIndex, 1);
  }

  // Update cardIndex for all remaining cards in DOM and data array
  const cardElements = document.querySelectorAll('.card');
  cardElements.forEach((el, idx) => {
    el.cardIndex = idx;
    if (window.cardsData && window.cardsData[idx]) {
      // Optionally, you can also update a property in the data object if needed
      window.cardsData[idx].cardIndex = idx;
    }
  });

  // Optionally show a message
  if (typeof Messages !== 'undefined') {
    Messages.showSuccess('Card deleted');
  }
};
