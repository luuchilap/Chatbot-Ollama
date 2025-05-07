import { dbService } from './dbService';

// BusinessDocument interface
export interface BusinessDocument {
  id?: number;
  title: string;
  content: string;
  status?: 'active' | 'archived';
  created_at?: Date;
  tags?: string[];
}

// DocumentSection interface
export interface DocumentSection {
  id?: number;
  document_id: number;
  section_title?: string;
  content: string;
  embedding?: number[]; // Vector representation
  created_at?: Date;
}

// Document Repository Class
export class DocumentRepository {
  // Create a new business document
  public async createDocument(document: BusinessDocument): Promise<BusinessDocument> {
    const query = `
      INSERT INTO business_documents (title, content, status, tags)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [
      document.title,
      document.content,
      document.status || 'active',
      document.tags || []
    ];
    const result = await dbService.query(query, params);
    return result[0];
  }

  // Get all business documents
  public async getAllDocuments(status?: 'active' | 'archived'): Promise<BusinessDocument[]> {
    let query = 'SELECT * FROM business_documents';
    const params: any[] = [];
    
    if (status) {
      query += ' WHERE status = $1';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    return await dbService.query(query, params);
  }

  // Get document by ID
  public async getDocumentById(id: number): Promise<BusinessDocument | null> {
    const query = 'SELECT * FROM business_documents WHERE id = $1';
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Update a business document
  public async updateDocument(id: number, document: Partial<BusinessDocument>): Promise<BusinessDocument | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (document.title !== undefined) {
      updateFields.push(`title = $${paramCount}`);
      values.push(document.title);
      paramCount++;
    }

    if (document.content !== undefined) {
      updateFields.push(`content = $${paramCount}`);
      values.push(document.content);
      paramCount++;
    }

    if (document.status !== undefined) {
      updateFields.push(`status = $${paramCount}`);
      values.push(document.status);
      paramCount++;
    }

    if (document.tags !== undefined) {
      updateFields.push(`tags = $${paramCount}`);
      values.push(document.tags);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE business_documents
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbService.query(query, values);
    return result.length > 0 ? result[0] : null;
  }

  // Delete a business document
  public async deleteDocument(id: number): Promise<boolean> {
    const query = 'DELETE FROM business_documents WHERE id = $1 RETURNING *';
    const result = await dbService.query(query, [id]);
    return result.length > 0;
  }

  // Create a new document section
  public async createDocumentSection(section: DocumentSection): Promise<DocumentSection> {
    const query = `
      INSERT INTO document_sections (document_id, section_title, content, embedding)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const params = [
      section.document_id,
      section.section_title || null,
      section.content,
      section.embedding || null
    ];
    const result = await dbService.query(query, params);
    return result[0];
  }

  // Get all sections for a document
  public async getSectionsByDocumentId(documentId: number): Promise<DocumentSection[]> {
    const query = 'SELECT * FROM document_sections WHERE document_id = $1 ORDER BY id ASC';
    return await dbService.query(query, [documentId]);
  }

  // Get section by ID
  public async getSectionById(id: number): Promise<DocumentSection | null> {
    const query = 'SELECT * FROM document_sections WHERE id = $1';
    const result = await dbService.query(query, [id]);
    return result.length > 0 ? result[0] : null;
  }

  // Update a document section
  public async updateSection(id: number, section: Partial<DocumentSection>): Promise<DocumentSection | null> {
    const updateFields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (section.section_title !== undefined) {
      updateFields.push(`section_title = $${paramCount}`);
      values.push(section.section_title);
      paramCount++;
    }

    if (section.content !== undefined) {
      updateFields.push(`content = $${paramCount}`);
      values.push(section.content);
      paramCount++;
    }

    if (section.embedding !== undefined) {
      updateFields.push(`embedding = $${paramCount}`);
      values.push(section.embedding);
      paramCount++;
    }

    if (updateFields.length === 0) {
      return null;
    }

    values.push(id);
    const query = `
      UPDATE document_sections
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await dbService.query(query, values);
    return result.length > 0 ? result[0] : null;
  }

  // Delete a document section
  public async deleteSection(id: number): Promise<boolean> {
    const query = 'DELETE FROM document_sections WHERE id = $1 RETURNING *';
    const result = await dbService.query(query, [id]);
    return result.length > 0;
  }

  // Search document sections by semantic similarity (using vector embeddings)
  public async searchSimilarSections(embedding: number[], limit: number = 5): Promise<DocumentSection[]> {
    // This query uses the vector_cosine_ops operator to find similar sections
    const query = `
      SELECT *, (embedding <=> $1) AS distance
      FROM document_sections
      WHERE embedding IS NOT NULL
      ORDER BY distance
      LIMIT $2
    `;
    
    return await dbService.query(query, [embedding, limit]);
  }
}

// Export singleton instance
export const documentRepository = new DocumentRepository(); 